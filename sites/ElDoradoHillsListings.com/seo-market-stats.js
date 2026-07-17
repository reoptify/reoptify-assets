(function () {
  'use strict';

  /* ----------------------------------------------------------
     1. DATA EXTRACTION
     Parse area name, date, and stat items from Sierra's widget.
     ---------------------------------------------------------- */

  function extractData(container) {
    var titleMain = container.querySelector('.si-property-stats__title-main');
    var titleDate  = container.querySelector('.si-property-stats__title-date');
    var itemEls    = container.querySelectorAll('.si-property-stats__item');

    var stats = [];
    for (var i = 0; i < itemEls.length; i++) {
      var valEl   = itemEls[i].querySelector('.si-property-stats__item-value');
      var labelEl = itemEls[i].querySelector('.si-property-stats__item-label');
      if (valEl && labelEl) {
        stats.push({
          raw:   valEl.textContent.trim(),
          label: labelEl.textContent.trim()
        });
      }
    }

    return {
      area:  titleMain ? titleMain.textContent.trim() : '',
      date:  titleDate  ? titleDate.textContent.trim()  : '',
      stats: stats
    };
  }

  /* ----------------------------------------------------------
     2. VALUE PARSING
     Splits a raw stat string like "$699,000" or "393.96" into
     parts needed for the counter animation.
     ---------------------------------------------------------- */

  function parseValue(raw) {
    var prefix   = '';
    var decimals = 0;
    var str      = raw;

    if (str.charAt(0) === '$') {
      prefix = '$';
      str = str.slice(1);
    }

    var clean = str.replace(/,/g, '');
    var dotPos = clean.indexOf('.');
    if (dotPos !== -1) {
      decimals = clean.length - dotPos - 1;
    }

    var num = parseFloat(clean);

    return {
      num:       isNaN(num) ? null : num,
      prefix:    prefix,
      decimals:  decimals,
      isNumeric: !isNaN(num)
    };
  }

  /* ----------------------------------------------------------
     3. NUMBER FORMATTING
     ---------------------------------------------------------- */

  function formatNum(num, prefix, decimals) {
    var str;
    if (decimals > 0) {
      str = num.toFixed(decimals);
    } else {
      str = Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return prefix + str;
  }

  /* ----------------------------------------------------------
     4. COUNTER ANIMATION
     Ease-out cubic, fires once when scrolled into view.
     ---------------------------------------------------------- */

  var DURATION = 1400; // ms

  function animateCounter(el, parsed) {
    if (!parsed.isNumeric) return;

    var start     = null;
    var fromVal   = 0;
    var toVal     = parsed.num;

    function step(ts) {
      if (!start) start = ts;
      var elapsed  = ts - start;
      var progress = Math.min(elapsed / DURATION, 1);
      var ease     = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      var current  = fromVal + (toVal - fromVal) * ease;
      el.textContent = formatNum(current, parsed.prefix, parsed.decimals);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = formatNum(toVal, parsed.prefix, parsed.decimals);
      }
    }

    requestAnimationFrame(step);
  }

  function attachCounters(widget) {
    var valueEls = widget.querySelectorAll('[data-stat-value]');

    if (!valueEls.length) return;

    function runAll() {
      for (var i = 0; i < valueEls.length; i++) {
        var el     = valueEls[i];
        var raw    = el.getAttribute('data-stat-value');
        var parsed = parseValue(raw);
        if (parsed.isNumeric) {
          el.textContent = parsed.prefix + '0';
          animateCounter(el, parsed);
        }
      }
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries, obs) {
        if (entries[0].isIntersecting) {
          obs.disconnect();
          runAll();
        }
      }, { threshold: 0.25 });
      io.observe(widget);
    } else {
      runAll();
    }
  }

  /* ----------------------------------------------------------
     5. WIDGET HTML BUILDER
     Constructs the custom markup from extracted data.
     ---------------------------------------------------------- */

  function buildHTML(data) {
    var statsHTML = '';

    for (var i = 0; i < data.stats.length; i++) {
      var s      = data.stats[i];
      var parsed = parseValue(s.raw);
      var displayVal = parsed.isNumeric
        ? formatNum(parsed.num, parsed.prefix, parsed.decimals)
        : s.raw;

      statsHTML +=
        '<div class="reopt-msw__stat">' +
          '<div class="reopt-msw__stat-bar" aria-hidden="true"></div>' +
          '<div class="reopt-msw__stat-value" data-stat-value="' + escAttr(s.raw) + '">' +
            escHTML(displayVal) +
          '</div>' +
          '<div class="reopt-msw__stat-label">' + escHTML(s.label) + '</div>' +
        '</div>';
    }

    return (
      '<div class="reopt-msw__header">' +
        '<div class="reopt-msw__header-left">' +
          '<span class="reopt-msw__live-badge">&#9679;&nbsp; Live MLS Data</span>' +
          '<p class="reopt-msw__area">' + escHTML(data.area) + '</p>' +
        '</div>' +
        '<div class="reopt-msw__header-right">' +
          '<span class="reopt-msw__as-of">As of</span>' +
          '<span class="reopt-msw__date">' + escHTML(data.date) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="reopt-msw__stats">' + statsHTML + '</div>'
    );
  }

  /* ----------------------------------------------------------
     6. SAFE STRING HELPERS
     ---------------------------------------------------------- */

  function escHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escAttr(str) {
    return str.replace(/"/g, '&quot;');
  }

  /* ----------------------------------------------------------
     7. INJECTION
     Preferred target: #reopt-stats-mount inside the market
     stats section. Falls back to inserting before Sierra's
     element if the mount point is not found.
     Sierra's original widget is always hidden either way.
     ---------------------------------------------------------- */

  function inject(siContainer, data) {
    if (!data.stats.length) return;

    var widget       = document.createElement('div');
    widget.className = 'reopt-msw';
    widget.setAttribute('role', 'region');
    widget.setAttribute('aria-label', 'Market Statistics — ' + data.area);
    widget.innerHTML = buildHTML(data);

    var mount = document.getElementById('reopt-stats-mount');
    if (mount) {
      mount.appendChild(widget);
    } else {
      siContainer.parentNode.insertBefore(widget, siContainer);
    }

    siContainer.style.cssText = 'display:none!important;visibility:hidden!important;';

    attachCounters(widget);
  }

  /* ----------------------------------------------------------
     8. OBSERVER — waits for Sierra to inject its widget
     Sierra often renders stats asynchronously, so we watch
     the whole document for the element to appear.
     ---------------------------------------------------------- */

  function tryInit() {
    var siEl = document.querySelector('.si-container.si-property-stats');
    if (!siEl) return false;

    var data = extractData(siEl);
    if (!data.stats.length) return false;

    inject(siEl, data);
    return true;
  }

  function init() {
    if (tryInit()) return;

    var observer = new MutationObserver(function (mutations, obs) {
      if (tryInit()) {
        obs.disconnect();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree:   true
    });

    setTimeout(function () { observer.disconnect(); }, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
