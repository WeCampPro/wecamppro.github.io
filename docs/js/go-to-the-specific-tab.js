  window.Webflow = window.Webflow || [];
  window.Webflow.push(function () {
    document.querySelectorAll('[data-open-tab]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();

        // Build the exact value used in data-w-tab
        var tabIndex = btn.getAttribute('data-open-tab'); // e.g. "4"
        var tabName  = "Tab " + tabIndex;                // "Tab 4"

        // Find the matching Webflow tab link
        var link = document.querySelector('.videos-tab-link[data-w-tab="' + tabName + '"]');
        if (link) {
          link.click();
        }

        // Optional: scroll to tab menu
        var menu = document.querySelector('.videos-tabs-menu');
        if (menu) {
          menu.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  });
