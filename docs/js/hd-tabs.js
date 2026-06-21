/* hd-tabs.js (W3.1) — one AlpineJS tab component replacing the Webflow w-tabs
   runtime (wf.js) and the five custom helper scripts it leaned on:
     one-scroll-desktop.js  (never loaded anywhere — dead, just deleted)
     one-scroll-mobile.js   (mobile pane stacking)            -> stack mode + hd.css §15
     sticky.js              (sticky tab menu)                 -> sticky mode
     go-to-top-of-tab.js    (scroll widget below the header)  -> scrollTop mode
     go-to-the-specific-tab.js ([data-open-tab] deep links)   -> the delegated
                                                                 click listener below

   Loaded as a NON-deferred <script> near the end of <body> (where the old helper
   scripts lived), so its `alpine:init` listener is registered BEFORE the deferred
   Alpine core in <head> boots — the same ordering contract nav.html (W2.1) relies
   on. The visual look of every tab style stays on the retained brand classes
   (.videos-tab-link, .course-tab-link, .tab-link.teacher, .student-wrapper, …,
   styled by academy.css/rtl.css); this component only owns *behaviour* and toggles
   the .hd-tab-active marker that hd.css §15 styles.

   Markup contract (per widget):
     wrapper  x-data="hdTabs({ initial, stack, sticky, scrollTop })"
              @hd-open-tab.window="openTab($event.detail)"
     menu     x-ref="menu" :class="{ sticky: stuck }"            (sticky mode)
     tab      role="tab" data-hd-tab="Tab N"
              :aria-selected / :tabindex / :class hd-tab-active
              @click / @keydown arrows
     pane     role="tabpanel" data-hd-tab="Tab N" x-show="shown('Tab N')" */
document.addEventListener('alpine:init', () => {
  Alpine.data('hdTabs', (config = {}) => ({
    current: config.initial || 'Tab 1',
    _stack: !!config.stack,
    _sticky: !!config.sticky,
    _scrollTop: !!config.scrollTop,
    mobile: false,   // viewport ≤767px (only tracked in stack mode)
    stuck: false,    // sticky menu currently pinned

    init() {
      if (this._stack) {
        const mq = window.matchMedia('(max-width: 767px)');
        this.mobile = mq.matches;
        const onChange = (e) => { this.mobile = e.matches; };
        // addEventListener is the modern API; addListener is the Safari<14 fallback.
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else mq.addListener(onChange);
      }
      if (this._sticky) this.$nextTick(() => this.initSticky());
    },

    /* A pane renders when it is the current tab — except in mobile stack mode,
       where every pane is shown stacked (reproduces one-scroll-mobile + the
       rtl.css ≤767 stacking). */
    shown(id) {
      return (this.mobile && this._stack) ? true : this.current === id;
    },

    /* A tab control is highlighted only when current. Suppressed in mobile stack
       mode — the menu is hidden there (rtl.css:407) and one-scroll-mobile cleared
       the active class, so nothing is highlighted. */
    selected(id) {
      return (this.mobile && this._stack) ? false : this.current === id;
    },

    select(id) {
      if (this.mobile && this._stack) return;   // links inert while stacked
      this.current = id;
      if (this._scrollTop) this.$nextTick(() => this.scrollToTop());
    },

    /* Roving arrow-key navigation (auto-activating tabs). Direction-aware for RTL
       so the visual left/right keys feel natural on the Persian-default site. */
    move(key) {
      const tabs = Array.from(this.$root.querySelectorAll('[role="tab"]'));
      if (!tabs.length) return;
      const ids = tabs.map((t) => t.getAttribute('data-hd-tab'));
      const rtl = getComputedStyle(this.$root).direction === 'rtl';
      const fwd = rtl ? 'ArrowLeft' : 'ArrowRight';
      const back = rtl ? 'ArrowRight' : 'ArrowLeft';
      let i = ids.indexOf(this.current);
      if (i < 0) i = 0;
      if (key === fwd || key === 'ArrowDown') i = (i + 1) % ids.length;
      else if (key === back || key === 'ArrowUp') i = (i - 1 + ids.length) % ids.length;
      else if (key === 'Home') i = 0;
      else if (key === 'End') i = ids.length - 1;
      else return;
      this.select(ids[i]);
      this.$nextTick(() => tabs[i] && tabs[i].focus());
    },

    /* Single @keydown entry point for the tab links — only the navigation keys
       are intercepted (and their default page-scroll prevented). */
    onKey(e) {
      const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
      if (!keys.includes(e.key)) return;
      e.preventDefault();
      this.move(e.key);
    },

    /* Scroll the widget just below the fixed header (reproduces go-to-top-of-tab.js;
       header selector updated for the W2.1 .hd-nav, with the old hooks as fallback). */
    scrollToTop() {
      const header = document.querySelector('.hd-nav, .header, .navbar, .site-header');
      const h = header ? header.getBoundingClientRect().height : 0;
      const top = this.$root.getBoundingClientRect().top + window.pageYOffset - h - 8;
      window.scrollTo({ top: top, behavior: 'smooth' });
    },

    /* Sticky tab menu (reproduces sticky.js): a 1px sentinel above the menu toggles
       `stuck` via IntersectionObserver; the menu keeps its .videos-tabs-menu class
       so rtl.css owns the sticky look, .sticky toggled by :class. */
    initSticky() {
      const menu = this.$refs.menu;
      if (!menu || !menu.parentNode) return;
      const sentinel = document.createElement('div');
      sentinel.style.height = '1px';
      menu.parentNode.insertBefore(sentinel, menu);
      new IntersectionObserver(
        ([entry]) => { this.stuck = !entry.isIntersecting; },
        { rootMargin: '0px', threshold: 0 }
      ).observe(sentinel);
    },

    /* Deep-link target (reproduces go-to-the-specific-tab.js): open the requested
       tab and scroll its menu into view. */
    openTab(detail) {
      const id = detail && detail.tab;
      if (!id) return;
      this.current = id;
      const menu = this.$refs.menu;
      if (menu) this.$nextTick(() => menu.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    },
  }));
});

/* Deep-link buttons ([data-open-tab="N"]) live far from the widget in the page
   hero, so a delegated, vanilla click listener (no Alpine scope needed on the
   button) translates them into the window event the widget listens for. Mirrors
   go-to-the-specific-tab.js, which built "Tab " + index the same way. */
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-open-tab]');
  if (!btn) return;
  e.preventDefault();
  window.dispatchEvent(new CustomEvent('hd-open-tab', {
    detail: { tab: 'Tab ' + btn.getAttribute('data-open-tab') },
  }));
});
