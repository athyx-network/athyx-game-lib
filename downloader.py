#!/usr/bin/env python3
"""
Game Downloader - downloads Unity WebGL games for local hosting.
Supports: onlinegames.io, Yandex Games CDN, and generic Unity WebGL pages.

Usage:
    python3 downloader.py <game_url> [output_folder]

Examples:
    python3 downloader.py "https://www.onlinegames.io/games/2022/unity/cobraz-io-classic/index.html"
    python3 downloader.py "https://app-441663.games.s3.yandex.net/441663/abc123_brotli/index.html" "Neon Balls"
"""

import sys
import os
import re
import urllib.request
import urllib.parse
import urllib.error
import shutil
import subprocess
from pathlib import Path

# ── ANSI colours ────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(msg):  print(f"  {GREEN}✓{RESET} {msg}")
def warn(msg): print(f"  {YELLOW}⚠{RESET}  {msg}")
def err(msg):  print(f"  {RED}✗{RESET} {msg}")
def info(msg): print(f"  {CYAN}→{RESET} {msg}")

# ── Yandex SDK stub injected into every Yandex game ─────────────────────────
YANDEX_SDK_STUB = """\
// ── Yandex Metrika stub (called directly from WASM in some games) ─────────
window.ym = function() {};

// ── Full Yandex Games SDK stub for local offline hosting ──────────────────
(function() {
  var noop    = function() {};
  var resolve = function(v) { return Promise.resolve(v); };

  var player = {
    getUniqueID:    function() { return 'local_player'; },
    getName:        function() { return 'Player'; },
    getPhoto:       function() { return ''; },
    getMode:        function() { return 'lite'; },
    getPayingStatus:function() { return 'non_paying'; },
    getData:        function() { return resolve({}); },
    setData:        function() { return resolve(); },
    getStats:       function() { return resolve({}); },
    setStats:       function() { return resolve(); },
    incrementStats: function() { return resolve({}); },
    scopePermissions: { public_name: 'deny', avatar: 'deny' }
  };

  var lb = {
    setLeaderboardScore:       function() { return resolve(); },
    getLeaderboardEntries:     function() { return resolve({ entries: [], userRank: 0 }); },
    getLeaderboardPlayerEntry: function() { return resolve({ rank: 0, score: 0, player: player }); }
  };

  var payments = {
    getCatalog:      function() { return resolve([]); },
    getPurchases:    function() { return resolve([]); },
    purchase:        function() { return Promise.reject(new Error('offline')); },
    consumePurchase: function() { return resolve(); }
  };

  var ysdk = {
    environment: {
      app:     { id: '0' },
      i18n:    { lang: 'en', tld: 'com' },
      browser: { lang: 'en' },
      payload: null
    },
    deviceInfo: {
      type:      'desktop',
      isMobile:  function() { return false; },
      isDesktop: function() { return true; },
      isTablet:  function() { return false; },
      isTV:      function() { return false; }
    },
    adv: {
      showFullscreenAdv: function(opts) {
        opts = opts || {};
        if (opts.callbacks && opts.callbacks.onClose) opts.callbacks.onClose(true);
      },
      showRewardedVideo: function(opts) {
        opts = opts || {};
        if (opts.callbacks && opts.callbacks.onRewarded) opts.callbacks.onRewarded();
        if (opts.callbacks && opts.callbacks.onClose)    opts.callbacks.onClose();
      },
      getBannerAdvStatus: function() { return resolve({ stickyAdvIsShowing: false, reason: 'ADV_IS_NOT_CONNECTED' }); },
      showBannerAdv: function() { return resolve({ stickyAdvIsShowing: false }); },
      hideBannerAdv: function() { return resolve({ stickyAdvIsShowing: false }); }
    },
    auth:     { openAuthDialog: function() { return Promise.reject(new Error('offline')); } },
    feedback: {
      canReview:     function() { return resolve({ value: false, reason: 'GAME_RATED' }); },
      requestReview: function() { return resolve({ feedbackSent: false }); }
    },
    shortcut: {
      canShowPrompt: function() { return resolve({ canShow: false }); },
      showPrompt:    function() { return resolve({ outcome: 'dismissed' }); }
    },
    features: { LoadingAPI: { ready: noop } },
    screen:   { fullscreen: { status: 'off', request: noop, exit: noop } },
    getPlayer:       function() { return resolve(player); },
    getPayments:     function() { return resolve(payments); },
    getLeaderboards: function() { return resolve(lb); }
  };

  window.YaGames = { init: function() { return resolve(ysdk); } };
  window.ysdk = ysdk;
})();
"""

# ── HTTP helpers ─────────────────────────────────────────────────────────────
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    ),
    "Accept-Encoding": "gzip, deflate",   # no brotli in stdlib; curl handles br
}

def fetch_text(url):
    """Download a URL and return it as a decoded string (handles gzip)."""
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.read().decode("utf-8", errors="replace")
    except Exception:
        return None

def download_file(url, dest_path, label=None):
    """
    Download a binary file to dest_path.
    Uses curl so we get brotli decompression transparently.
    Returns True on success.
    """
    dest_path = Path(dest_path)
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    label = label or dest_path.name

    cmd = [
        "curl", "-s", "--compressed",
        "-H", f"User-Agent: {HEADERS['User-Agent']}",
        "-o", str(dest_path),
        "-w", "%{http_code}",
        url,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        code = result.stdout.strip()
        if code == "200" and dest_path.stat().st_size > 0:
            size = dest_path.stat().st_size
            size_str = f"{size/1024/1024:.1f} MB" if size > 1_000_000 else f"{size/1024:.0f} KB"
            ok(f"{label} ({size_str})")
            return True
        else:
            dest_path.unlink(missing_ok=True)
            warn(f"{label} — HTTP {code}, skipped")
            return False
    except subprocess.TimeoutExpired:
        dest_path.unlink(missing_ok=True)
        err(f"{label} — timed out")
        return False
    except Exception as e:
        dest_path.unlink(missing_ok=True)
        err(f"{label} — {e}")
        return False

# ── HTML cleaning ────────────────────────────────────────────────────────────
def clean_html(html, is_yandex=False):
    """Strip trackers, CSP headers, broken templates from the HTML."""

    # Remove Yandex CDN Content-Security-Policy (massive, breaks local hosting)
    html = re.sub(
        r'<meta\s+http-equiv=["\']Content-Security-Policy["\'][^>]*/?>',
        '', html, flags=re.IGNORECASE
    )

    # Remove Google Analytics / gtag
    html = re.sub(
        r'<!--\s*Google tag.*?-->\s*<script[^>]*googletagmanager[^>]*>.*?</script>\s*'
        r'<script>.*?gtag\(.*?</script>',
        '', html, flags=re.DOTALL | re.IGNORECASE
    )
    html = re.sub(
        r'<script[^>]*googletagmanager[^>]*>.*?</script>',
        '', html, flags=re.DOTALL | re.IGNORECASE
    )
    html = re.sub(
        r'<script[^>]*>\s*window\.dataLayer.*?gtag\(\'config\'.*?</script>',
        '', html, flags=re.DOTALL | re.IGNORECASE
    )

    # Remove Yandex Metrika
    html = re.sub(
        r'<!--\s*Yandex\.Metrika counter\s*-->.*?<!--\s*/Yandex\.Metrika counter\s*-->',
        '', html, flags=re.DOTALL | re.IGNORECASE
    )

    # Remove wgplayer ad tracker
    html = re.sub(
        r'<script[^>]*>\s*!function.*?wgplayer\.com.*?</script>',
        '', html, flags=re.DOTALL | re.IGNORECASE
    )

    # Remove Cloudflare beacon
    html = re.sub(
        r'<script[^>]*cloudflareinsights[^>]*/?>',
        '', html, flags=re.IGNORECASE
    )

    # Remove canonical links pointing to external sites
    html = re.sub(
        r'<link\s+rel=["\']canonical["\'][^>]*/?>',
        '', html, flags=re.IGNORECASE
    )

    # Fix absolute /sdk.js -> relative ./sdk.js
    html = re.sub(r'src=["\']/sdk\.js["\']', 'src="./sdk.js"', html)

    # Fix broken CSS template placeholders (e.g. {{{BACKGROUND_COLOR}}})
    html = re.sub(r'\{\{\{[A-Z_]+\}\}\}', '#000000', html)

    return html

def fix_broken_css(css_text):
    """Fix template placeholders like {{{BACKGROUND_COLOR}}} in CSS files."""
    fixed = re.sub(
        r'background:\s*\n?\s*\{[\s\S]*?\}\s*;',
        'background: #000000;',
        css_text
    )
    return fixed

# ── Asset reference extraction ───────────────────────────────────────────────
def extract_build_files(html):
    """
    Parse the Unity loader config block from the HTML and return
    a dict of { 'loader'|'data'|'framework'|'code' -> relative_path }.
    Also returns buildUrl prefix.
    """
    assets = {}

    # Build directory
    build_url = "Build"
    m = re.search(r'(?:var\s+|const\s+)buildUrl\s*=\s*["\']([^"\']+)["\']', html)
    if m:
        build_url = m.group(1)

    # loader
    m = re.search(r'(?:var\s+|const\s+)loaderUrl\s*=\s*[^;]+?["\']([^"\']+\.loader\.js)["\']', html)
    if not m:
        m = re.search(r'buildUrl\s*\+\s*["\']/?([^"\']+\.loader\.js)["\']', html)
    if m:
        assets['loader'] = f"{build_url}/{m.group(1).lstrip('/')}"

    # data
    m = re.search(r'dataUrl\s*:\s*buildUrl\s*\+\s*(?:dataFile|["\']([^"\']+\.(?:data|unityweb)[^"\']*)["\'])', html)
    if not m:
        m = re.search(r'dataUrl\s*:\s*["\']([^"\']+)["\']', html)
    if not m:
        # dataFile variable
        m2 = re.search(r'var\s+dataFile\s*=\s*["\']([^"\']+)["\']', html)
        if m2:
            assets['data'] = f"{build_url}/{m2.group(1).lstrip('/')}"
    if m and m.lastindex and m.group(1):
        assets['data'] = f"{build_url}/{m.group(1).lstrip('/')}"

    # framework
    m = re.search(r'frameworkUrl\s*:\s*buildUrl\s*\+\s*["\']([^"\']+)["\']', html)
    if not m:
        m = re.search(r'frameworkUrl\s*:\s*["\']([^"\']+)["\']', html)
    if m:
        assets['framework'] = f"{build_url}/{m.group(1).lstrip('/')}"

    # code / wasm
    m = re.search(r'codeUrl\s*:\s*buildUrl\s*\+\s*["\']([^"\']+)["\']', html)
    if not m:
        m = re.search(r'(?:wasmCodeUrl|codeUrl)\s*:\s*["\']([^"\']+)["\']', html)
    if m:
        assets['code'] = f"{build_url}/{m.group(1).lstrip('/')}"

    # Older Unity format: UnityLoader + game.json / game.data
    if 'loader' not in assets:
        m = re.search(r'src=["\']([^"\']*UnityLoader[^"\']*)["\']', html)
        if m:
            assets['loader'] = m.group(1)
    m = re.search(r'UnityLoader\.instantiate\([^,]+,\s*["\']([^"\']+)["\']', html)
    if m:
        assets['manifest'] = m.group(1)

    return assets

def find_optional_assets(html):
    """Return list of optional relative asset paths referenced in the HTML."""
    optional = []
    for pattern in [
        r'src=["\'](?!http|//|data:)([^"\']+\.(?:png|jpg|jpeg|gif|mp3|ogg|wav|svg))["\']',
        r'url\(["\']?(?!http|//|data:)([^"\')\s]+\.(?:png|jpg|jpeg|gif))["\']?\)',
        r'background\s*=\s*["\']url\(["\']?([^"\')\s]+)["\']?\)',
    ]:
        for m in re.finditer(pattern, html, re.IGNORECASE):
            path = m.group(1).lstrip('./')
            if path and path not in optional and 'TemplateData' not in path:
                optional.append(path)
    return list(dict.fromkeys(optional))  # dedupe, preserve order

# ── Main downloader ──────────────────────────────────────────────────────────
def derive_folder_name(url, given_name=None):
    if given_name:
        return given_name
    parsed = urllib.parse.urlparse(url)
    # Try to get a meaningful name from the URL path
    parts = [p for p in parsed.path.split('/') if p and p != 'index.html']
    if parts:
        name = parts[-1] if parts[-1] != 'index.html' else parts[-2]
        # Clean up common suffixes
        name = re.sub(r'[-_](classic|web|webgl|v\d+[\d.]*|brotli)$', '', name, flags=re.IGNORECASE)
        name = name.replace('-', ' ').replace('_', ' ').title()
        return name
    return "Downloaded Game"

def get_base_url(url):
    """Return the directory base URL (without filename)."""
    parsed = urllib.parse.urlparse(url)
    path = parsed.path
    if not path.endswith('/'):
        path = path.rsplit('/', 1)[0] + '/'
    return urllib.parse.urlunparse((parsed.scheme, parsed.netloc, path, '', '', ''))

def is_yandex(url):
    return 'yandex' in url or 'games.s3' in url or 'cdn.games' in url

def download_game(url, output_dir=None):
    # Strip query/fragment for base URL calculation
    clean_url = url.split('?')[0].split('#')[0]
    base_url = get_base_url(clean_url)
    folder_name = derive_folder_name(clean_url, output_dir)
    dest = Path(__file__).parent / folder_name
    yandex = is_yandex(url)

    print(f"\n{BOLD}{CYAN}{'─'*55}{RESET}")
    print(f"{BOLD}  Downloading: {folder_name}{RESET}")
    print(f"  URL: {clean_url}")
    print(f"  Dest: {dest}")
    print(f"{BOLD}{CYAN}{'─'*55}{RESET}\n")

    dest.mkdir(parents=True, exist_ok=True)

    # ── 1. Fetch index.html ──────────────────────────────────────────────────
    info("Fetching index.html...")
    # Use curl for brotli support
    result = subprocess.run(
        ["curl", "-s", "--compressed",
         "-H", f"User-Agent: {HEADERS['User-Agent']}",
         clean_url],
        capture_output=True, timeout=30
    )
    try:
        html = result.stdout.decode("utf-8", errors="replace")
    except Exception:
        err("Failed to fetch index.html")
        return False

    if not html.strip():
        err("Empty response from server")
        return False

    # ── 2. Clean HTML ────────────────────────────────────────────────────────
    info("Cleaning HTML (removing trackers, CSP, bloat)...")
    html = clean_html(html, is_yandex=yandex)

    # Add onerror to audio tags so missing files fail silently
    def _patch_audio(m):
        tag = m.group(1)
        if 'onerror' in tag:
            return m.group(0)
        return tag + ' onerror="this.removeAttribute(\'src\')">'
    html = re.sub(r'(<audio\b[^>]*\bsrc=["\'][^"\']*["\'][^>]*?)>', _patch_audio, html)

    # ── 3. Parse asset references ────────────────────────────────────────────
    build_assets = extract_build_files(html)
    optional_assets = find_optional_assets(html)

    print(f"  {BOLD}Build files found:{RESET}")
    for k, v in build_assets.items():
        print(f"    {k}: {v}")

    # ── 4. Download TemplateData ─────────────────────────────────────────────
    print(f"\n  {BOLD}TemplateData:{RESET}")
    td_files = ["favicon.ico", "style.css", "UnityProgress.js",
                "webgl-logo.png", "fullscreen.png",
                "progressLogo.Light.png", "progressLogo.Dark.png",
                "progressEmpty.Light.png", "progressEmpty.Dark.png",
                "progressFull.Light.png", "progressFull.Dark.png"]
    for f in td_files:
        download_file(
            f"{base_url}TemplateData/{f}",
            dest / "TemplateData" / f,
            label=f"TemplateData/{f}"
        )

    # Fix broken CSS template in style.css
    style_path = dest / "TemplateData" / "style.css"
    if style_path.exists():
        css = style_path.read_text(encoding="utf-8", errors="replace")
        fixed = fix_broken_css(css)
        if fixed != css:
            style_path.write_text(fixed, encoding="utf-8")
            ok("style.css — fixed broken template placeholder")

    # Also check for root-level style.css (some games use ./style.css)
    root_style = base_url + "style.css"
    download_file(root_style, dest / "style.css", label="style.css (root)")
    root_css_path = dest / "style.css"
    if root_css_path.exists():
        css = root_css_path.read_text(encoding="utf-8", errors="replace")
        fixed = fix_broken_css(css)
        if fixed != css:
            root_css_path.write_text(fixed, encoding="utf-8")

    # ── 5. Download optional assets ──────────────────────────────────────────
    if optional_assets:
        print(f"\n  {BOLD}Optional assets:{RESET}")
    for asset in optional_assets:
        download_file(
            f"{base_url}{asset}",
            dest / asset,
            label=asset
        )

    # ── 6. Download Build files ──────────────────────────────────────────────
    print(f"\n  {BOLD}Build files:{RESET}")
    for key, rel_path in build_assets.items():
        # Normalise path: remove leading slash or ./
        rel_path = rel_path.lstrip('.').lstrip('/')
        download_file(
            f"{base_url}{rel_path}",
            dest / rel_path,
            label=rel_path
        )

    # ── 7. Yandex SDK stub ───────────────────────────────────────────────────
    if yandex or '/sdk.js' in html or './sdk.js' in html:
        sdk_path = dest / "sdk.js"
        sdk_path.write_text(YANDEX_SDK_STUB, encoding="utf-8")
        ok("sdk.js (Yandex SDK local stub)")

    # ── 8. Save cleaned index.html ───────────────────────────────────────────
    (dest / "index.html").write_text(html, encoding="utf-8")
    ok("index.html saved")

    # ── 9. Summary ───────────────────────────────────────────────────────────
    total_size = sum(f.stat().st_size for f in dest.rglob('*') if f.is_file())
    size_mb = total_size / 1024 / 1024
    file_count = sum(1 for _ in dest.rglob('*') if _.is_file())

    print(f"\n{BOLD}{GREEN}{'─'*55}{RESET}")
    print(f"{BOLD}{GREEN}  Done!{RESET} {file_count} files · {size_mb:.1f} MB")
    print(f"  Folder: {dest}")
    print(f"{BOLD}{GREEN}{'─'*55}{RESET}\n")
    return True


# ── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    game_url    = sys.argv[1]
    output_name = sys.argv[2] if len(sys.argv) > 2 else None

    success = download_game(game_url, output_name)
    sys.exit(0 if success else 1)
