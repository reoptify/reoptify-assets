(function () {
  'use strict';

  /* ----------------------------------------------------------
     1. DATA EXTRACTION
     Pull title + link list from one .si-content-label element.
     ---------------------------------------------------------- */

  function extractData(container) {
    var titleEl = container.querySelector('.si-content-label__title');
    var linkEls = container.querySelectorAll('.si-content-label__link a');

    var links = [];
    for (var i = 0; i < linkEls.length; i++) {
      var a = linkEls[i];
      links.push({
        href:  a.getAttribute('href') || '#',
        title: a.getAttribute('title') || '',
        text:  a.textContent.trim()
      });
    }

    return {
      title: titleEl ? titleEl.textContent.trim() : '',
      links: links
    };
  }

  /* ----------------------------------------------------------
     2. WIDGET HTML BUILDER
     ---------------------------------------------------------- */

  function escHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildHTML(data) {
    var titleHTML = '';
    if (data.title) {
      titleHTML =
        '<div class="reopt-cl__header">' +
          '<span class="reopt-cl__title">' + escHTML(data.title) + '</span>' +
          '<div class="reopt-cl__rule" aria-hidden="true"></div>' +
        '</div>';
    }

    var pillsHTML = '';
    for (var i = 0; i < data.links.length; i++) {
      var link = data.links[i];
      pillsHTML +=
        '<li class="reopt-cl__item">' +
          '<a class="reopt-cl__pill" href="' + escHTML(link.href) + '"' +
            (link.title ? ' title="' + escHTML(link.title) + '"' : '') +
          '>' +
            escHTML(link.text) +
          '</a>' +
        '</li>';
    }

    return (
      titleHTML +
      '<ul class="reopt-cl__list" role="list">' +
        pillsHTML +
      '</ul>'
    );
  }

  /* ----------------------------------------------------------
     3. INJECTION
     Build the custom widget, insert before Sierra's element,
     hide the original.
     ---------------------------------------------------------- */

  function inject(siContainer) {
    var data = extractData(siContainer);

    if (!data.links.length) return;

    var widget       = document.createElement('div');
    widget.className = 'reopt-cl';
    widget.setAttribute('role', 'navigation');
    if (data.title) {
      widget.setAttribute('aria-label', data.title);
    }
    widget.innerHTML = buildHTML(data);

    siContainer.parentNode.insertBefore(widget, siContainer);
    siContainer.style.cssText = 'display:none!important;visibility:hidden!important;';
  }

  /* ----------------------------------------------------------
     4. PROCESS ALL INSTANCES
     Handles multiple Content Label components on one page.
     ---------------------------------------------------------- */

  function processAll() {
    var containers = document.querySelectorAll('.si-content-label');
    for (var i = 0; i < containers.length; i++) {
      if (!containers[i].hasAttribute('data-reopt-cl-done')) {
        containers[i].setAttribute('data-reopt-cl-done', '1');
        inject(containers[i]);
      }
    }
  }

  /* ----------------------------------------------------------
     5. OBSERVER
     Sierra may inject Content Label components asynchronously.
     Watch the DOM for any that appear after page load.
     ---------------------------------------------------------- */

  function init() {
    processAll();

    var observer = new MutationObserver(function () {
      processAll();
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
