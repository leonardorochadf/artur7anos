(function (global) {
  // Helper de eventos; a tag gtag principal fica no HTML (snippet oficial).
  var cfg = global.ARTUR_CONFIG || {};
  var gaId = String(cfg.gaId || 'G-Y4KXBY80XL').trim();

  global.ArturAnalytics = {
    ready: function () {
      return typeof global.gtag === 'function';
    },
    event: function (name, params) {
      if (!name || typeof global.gtag !== 'function') return;
      try {
        global.gtag('event', name, params || {});
      } catch (e) {}
    },
    gaId: gaId
  };
})(window);
