/* hd-survey.js (W3.2) — AlpineJS replacement for static/js/slider.js, the
   porsline survey slide-in. The old script injected a runtime <style> block, an
   overlay <div>, and global showSlider()/closeSlider() functions; all of that is
   replaced by:
     - the layouts/partials/survey.html markup (x-data="hdSurvey(...)"), and
     - the .hd-survey-* rules in hd.css §16 (no runtime style injection).

   A trigger anywhere on the page opens the panel by firing a window event:
     window.dispatchEvent(new CustomEvent('hd-open-survey', {detail:{url:'…'}}))
   The panel closes on backdrop click, Escape, or a parent postMessage('hello')
   (the survey iframe posts this when it finishes) — matching the original.

   Timing is preserved exactly via the CSS transitions ported from slider.js:
   the overlay fades over 700ms (`active`) and the panel slides over 500ms
   (`open`); on close the panel slides out first, then 500ms later the overlay is
   hidden and the iframe src cleared (stops the survey loading in the background).

   Loaded as a NON-deferred <script> near the end of <body> so this `alpine:init`
   listener registers BEFORE the deferred Alpine core in <head> boots — the same
   ordering contract hd-tabs.js (W3.1) and nav.html (W2.1) rely on. */
document.addEventListener('alpine:init', () => {
  Alpine.data('hdSurvey', (config = {}) => ({
    position: config.position === 'left' ? 'left' : 'right',
    active: false,   // overlay visible (700ms fade)
    open: false,     // panel slid in (500ms)
    src: '',
    _timer: null,
    _opener: null,
    _previousBodyOverflow: null,

    /* detail.url → iframe src, then reveal overlay + slide the panel in. Both
       flags flip in the same tick: the element is already rendered in its closed
       state, so the CSS transitions animate (mirrors the original showSlider,
       which set the styles and added .open synchronously). */
    show(detail) {
      if (this._timer) { clearTimeout(this._timer); this._timer = null; }
      if (!this.active) {
        this._opener = document.activeElement;
        this._previousBodyOverflow = document.body.style.overflow;
      }
      const url = detail && detail.url;
      if (url) {
        if (this.$refs.frame) this.$refs.frame.fetchPriority = 'high';
        this.src = url;
      }
      this.active = true;
      this.open = true;
      document.body.style.overflow = 'hidden';
      this.$nextTick(() => requestAnimationFrame(() => {
        if (this.$refs.close) this.$refs.close.focus();
      }));
    },

    /* Slide the panel out (500ms), then hide the overlay and drop the iframe —
       same sequence/timeout as the original closeSlider. */
    close() {
      if (!this.active && !this.open) return;
      this.open = false;
      if (this._timer) clearTimeout(this._timer);
      this._timer = setTimeout(() => {
        this.active = false;
        this.src = '';
        this._timer = null;
        document.body.style.overflow = this._previousBodyOverflow || '';
        this._previousBodyOverflow = null;
        const opener = this._opener;
        this._opener = null;
        if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
      }, 500);
    },

    trap(e) {
      if (!this.active) return;
      const sel = 'a[href],button:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])';
      const items = Array.from(this.$root.querySelectorAll(sel))
        .filter((el) => getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length > 0);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
  }));
});
