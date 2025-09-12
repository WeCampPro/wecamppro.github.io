const tabsMenu = document.querySelector('.videos-tabs-menu');

// Create a "sentinel" above the tabs menu to detect scroll past
const sentinel = document.createElement('div');
sentinel.style.height = '1px';
tabsMenu.parentNode.insertBefore(sentinel, tabsMenu);

const observer = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) {
      // Menu is in original place, not sticky
      tabsMenu.classList.remove('sticky');
    } else {
      // Menu has scrolled past, now sticky
      tabsMenu.classList.add('sticky');
    }
  },
  { rootMargin: '0px', threshold: 0 }
);

observer.observe(sentinel);
