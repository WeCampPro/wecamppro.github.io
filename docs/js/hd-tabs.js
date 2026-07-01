/* hd-tabs.js (W3.1) — one AlpineJS tab component replacing the Webflow w-tabs
   runtime and the five custom helper scripts it leaned on:
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
     wrapper  x-data="hdTabs({ initial, stack, sticky, scrollTop, showAll })"
              @hd-open-tab.window="openTab($event.detail)"
     menu     x-ref="menu" :class="{ sticky: stuck }"            (sticky mode)
     tab      role="tab" data-hd-tab="Tab N"
              :aria-selected / :tabindex / :class hd-tab-active
              @click / @keydown arrows
     pane     role="tabpanel" data-hd-tab="Tab N" x-show="shown('Tab N')"

   showAll mode keeps every pane visible and turns the tab controls into sticky
   in-page section navigation for long landing-page flows. */
document.addEventListener('alpine:init', () => {
  let nextUid = 0;

  Alpine.data('hdTabs', (config = {}) => ({
    current: config.initial || 'Tab 1',
    _stack: !!config.stack,
    _sticky: !!config.sticky,
    _scrollTop: !!config.scrollTop,
    _showAll: !!config.showAll,
    _uid: 'hd-tabs-' + (++nextUid),
    _spyFrame: null,
    _scrollingTo: null,
    _scrollTimer: null,
    mobile: false,   // viewport ≤767px (only tracked in stack mode)
    stuck: false,    // sticky menu currently pinned

    init() {
      this.$nextTick(() => this.syncA11y());
      if (this._stack) {
        const mq = window.matchMedia('(max-width: 767px)');
        this.mobile = mq.matches;
        const onChange = (e) => {
          this.mobile = e.matches;
          this.$nextTick(() => this.syncA11y());
        };
        // addEventListener is the modern API; addListener is the Safari<14 fallback.
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else mq.addListener(onChange);
      }
      if (this._sticky) this.$nextTick(() => this.initSticky());
      if (this._showAll) this.$nextTick(() => this.initSectionSpy());
    },

    safeId(id) {
      return String(id || 'tab')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'tab';
    },

    syncA11y() {
      const menu = this.$root.querySelector('[role="tablist"]');
      if (menu && !menu.hasAttribute('aria-label') && !menu.hasAttribute('aria-labelledby')) {
        menu.setAttribute('aria-label', 'بخش‌های صفحه');
      }

      const tabs = Array.from(this.$root.querySelectorAll('[role="tab"][data-hd-tab]'));
      const panels = Array.from(this.$root.querySelectorAll('[role="tabpanel"][data-hd-tab]'));
      tabs.forEach((tab) => {
        const id = tab.getAttribute('data-hd-tab');
        const panel = panels.find((p) => p.getAttribute('data-hd-tab') === id);
        if (!panel) return;

        const suffix = this.safeId(id);
        if (!tab.id) tab.id = this._uid + '-tab-' + suffix;
        if (!panel.id) panel.id = this._uid + '-panel-' + suffix;
        tab.setAttribute('aria-controls', panel.id);
        panel.setAttribute('aria-labelledby', tab.id);
      });
    },

    /* A pane renders when it is the current tab — except in showAll mode or
       mobile stack mode,
       where every pane is shown stacked (reproduces one-scroll-mobile + the
       rtl.css ≤767 stacking). */
    shown(id) {
      return this._showAll || ((this.mobile && this._stack) ? true : this.current === id);
    },

    /* A tab control is highlighted only when current. Suppressed in mobile stack
       mode — the menu is hidden there (rtl.css:407) and one-scroll-mobile cleared
       the active class, so nothing is highlighted. */
    selected(id) {
      return (this.mobile && this._stack) ? false : this.current === id;
    },

    select(id) {
      if (this.mobile && this._stack && !this._showAll) return;   // links inert while stacked
      this.current = id;
      this.$nextTick(() => {
        this.syncA11y();
        if (this._showAll) this.scrollToPanel(id);
        else if (this._scrollTop) this.scrollToTop();
      });
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

    scrollOffset() {
      let offset = 16;
      const header = document.querySelector('.hd-nav, .header, .navbar, .site-header');
      if (header) {
        const position = getComputedStyle(header).position;
        if (position === 'fixed' || position === 'sticky') {
          offset += header.getBoundingClientRect().height;
        }
      }
      const menu = this.$refs.menu;
      if (menu) offset += menu.getBoundingClientRect().height;
      return offset;
    },

    panelFor(id) {
      return Array.from(this.$root.querySelectorAll('[role="tabpanel"][data-hd-tab]'))
        .find((panel) => panel.getAttribute('data-hd-tab') === id);
    },

    scrollToPanel(id) {
      const panel = this.panelFor(id);
      if (!panel) return;
      this._scrollingTo = id;
      if (this._scrollTimer) window.clearTimeout(this._scrollTimer);
      this._scrollTimer = window.setTimeout(() => {
        this.current = id;
        this._scrollingTo = null;
        this._scrollTimer = null;
      }, 1000);

      const run = () => {
        const top = panel.getBoundingClientRect().top + window.pageYOffset - this.scrollOffset();
        window.scrollTo({ top, behavior: 'smooth' });
      };

      if (this._showAll && this._sticky && this.$refs.menu && !this.stuck) {
        this.stuck = true;
        this.$nextTick(() => window.requestAnimationFrame(run));
        return;
      }

      run();
    },

    initSectionSpy() {
      const panels = Array.from(this.$root.querySelectorAll('[role="tabpanel"][data-hd-tab]'));
      if (!panels.length) return;

      const update = () => {
        this._spyFrame = null;
        if (this._scrollingTo) return;
        const marker = this.scrollOffset() + 24;
        let active = panels[0];

        panels.forEach((panel) => {
          const rect = panel.getBoundingClientRect();
          if (rect.top <= marker && rect.bottom > marker) active = panel;
        });

        const id = active && active.getAttribute('data-hd-tab');
        if (id && id !== this.current) this.current = id;
      };

      const request = () => {
        if (this._spyFrame) return;
        this._spyFrame = window.requestAnimationFrame(update);
      };

      window.addEventListener('scroll', request, { passive: true });
      window.addEventListener('resize', request);
      request();
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
      this.$nextTick(() => {
        this.syncA11y();
        if (this._showAll) this.scrollToPanel(id);
        else if (menu) menu.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
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
