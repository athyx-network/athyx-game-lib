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
