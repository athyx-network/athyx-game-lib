// ── Yandex Metrika stub (called directly from WASM) ──────────────────────
window.ym = function() {};

// ── Full Yandex Games SDK stub for local offline hosting ─────────────────
(function() {
  var noop     = function() {};
  var resolve  = function(v) { return Promise.resolve(v); };

  // Minimal player mock
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

  // Minimal leaderboard mock
  var lb = {
    setLeaderboardScore:   function() { return resolve(); },
    getLeaderboardEntries: function() {
      return resolve({ entries: [], userRank: 0 });
    },
    getLeaderboardPlayerEntry: function() {
      return resolve({ rank: 0, score: 0, player: player });
    }
  };

  // Payments mock
  var payments = {
    getCatalog:       function() { return resolve([]); },
    getPurchases:     function() { return resolve([]); },
    purchase:         function() { return Promise.reject(new Error('offline')); },
    consumePurchase:  function() { return resolve(); }
  };

  var ysdk = {
    // Environment info
    environment: {
      app:     { id: '0' },
      i18n:    { lang: 'en', tld: 'com' },
      browser: { lang: 'en' },
      payload: null
    },

    // Device info
    deviceInfo: {
      type:      'desktop',
      isMobile:  function() { return false; },
      isDesktop: function() { return true; },
      isTablet:  function() { return false; },
      isTV:      function() { return false; }
    },

    // Advertising (all no-ops that call their callbacks immediately)
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
      getBannerAdvStatus: function() {
        return resolve({ stickyAdvIsShowing: false, reason: 'ADV_IS_NOT_CONNECTED' });
      },
      showBannerAdv: function() { return resolve({ stickyAdvIsShowing: false }); },
      hideBannerAdv: function() { return resolve({ stickyAdvIsShowing: false }); }
    },

    // Auth
    auth: {
      openAuthDialog: function() { return Promise.reject(new Error('offline')); }
    },

    // Feedback / reviews
    feedback: {
      canReview:     function() { return resolve({ value: false, reason: 'GAME_RATED' }); },
      requestReview: function() { return resolve({ feedbackSent: false }); }
    },

    // Shortcut / add-to-homescreen
    shortcut: {
      canShowPrompt: function() { return resolve({ canShow: false }); },
      showPrompt:    function() { return resolve({ outcome: 'dismissed' }); }
    },

    // Features
    features: {
      LoadingAPI: { ready: noop }
    },

    // Screen
    screen: {
      fullscreen: {
        status: 'off',
        request: noop,
        exit:    noop
      }
    },

    // Player
    getPlayer: function() { return resolve(player); },

    // Payments
    getPayments: function() { return resolve(payments); },

    // Leaderboards
    getLeaderboards: function() { return resolve(lb); }
  };

  window.YaGames = {
    init: function() { return resolve(ysdk); }
  };

  // Also expose ysdk globally in case anything reaches for it directly
  window.ysdk = ysdk;
})();
