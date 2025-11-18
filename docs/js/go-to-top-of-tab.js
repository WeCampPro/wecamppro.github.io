document.addEventListener('DOMContentLoaded', function () {
  var tabs = document.querySelector('.videos-tabs'); // wrapper around the tabs
  if (!tabs) return;

  // Try to detect a sticky header to avoid covering the top
  var header = document.querySelector('.header, .navbar, .site-header');
  function headerHeight() {
    return header ? header.getBoundingClientRect().height : 0;
  }

  function scrollToTabsTop() {
    var top =
      tabs.getBoundingClientRect().top + window.pageYOffset - headerHeight() - 8;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  // Webflow tabs: clicking .w-tab-link switches panes; we hook into that
  tabs.querySelectorAll('.w-tab-link').forEach(function (link) {
    link.addEventListener('click', function () {
      requestAnimationFrame(scrollToTabsTop);
    });
    link.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') requestAnimationFrame(scrollToTabsTop);
    });
  });
});
