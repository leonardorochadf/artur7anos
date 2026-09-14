(function (global) {
  var cfg = global.ARTUR_CONFIG || {};
  var gaId = String(cfg.gaId || '').trim();

  function noop() {}

  global.ArturAnalytics = {
    ready: function () {
      return !!(gaId && gaId.indexOf('G-') === 0 && typeof global.gtag === 'function');
    },
    event: function (name, params) {
      if (!name || typeof global.gtag !== 'function') return;
      try {
        global.gtag('event', name, params || {});
      } catch (e) {}
    }
  };

  if (!gaId || gaId.indexOf('G-') !== 0) {
    global.gtag = global.gtag || noop;
    return;
  }

  global.dataLayer = global.dataLayer || [];
  function gtag() {
    global.dataLayer.push(arguments);
  }
  global.gtag = gtag;

  gtag('js', new Date());
  gtag('config', gaId);

  var s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(gaId);
  var first = document.getElementsByTagName('script')[0];
  if (first && first.parentNode) {
    first.parentNode.insertBefore(s, first);
  } else {
    document.head.appendChild(s);
  }
})(window);
