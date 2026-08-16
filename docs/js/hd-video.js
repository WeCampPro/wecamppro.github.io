/* WECAMP camp-video host for the released native HTS Dialog contract.
 *
 * The browser owns top-layer modality, focus containment, Escape, and the
 * native close-form behavior. This host owns only the caller's local MP4,
 * trigger state/relationship attributes, outside-primary dismissal, playback
 * teardown, and deterministic focus return. It loads before deferred Alpine. */
document.addEventListener('alpine:init', () => {
  Alpine.data('hdVideo', () => ({
    src: '',
    _opener: null,

    show(detail) {
      if (!detail || typeof detail.src !== 'string') return;
      const cleanSrc = detail.src.split(/[?#]/, 1)[0];
      if (!cleanSrc.startsWith('/vid/') || cleanSrc.includes('..') || !cleanSrc.endsWith('.mp4')) return;

      const dialog = this.$root;
      if (!dialog || !dialog.isConnected || dialog.open || typeof dialog.showModal !== 'function') return;

      const trigger = detail.trigger;
      this._opener = trigger && trigger.isConnected ? trigger : document.activeElement;
      this.src = detail.src;

      this.$nextTick(() => {
        if (!dialog.isConnected || dialog.open) return;
        try {
          dialog.showModal();
        } catch (error) {
          this.src = '';
          this._opener = null;
          return;
        }
        if (this._opener && this._opener.isConnected) {
          this._opener.setAttribute('aria-expanded', 'true');
          this._opener.setAttribute('aria-controls', dialog.id);
          this._opener.setAttribute('data-state', 'open');
        }
        if (this.$refs.close) this.$refs.close.focus();
        if (this.$refs.video) {
          try { this.$refs.video.currentTime = 0; } catch (e) {}
          const playing = this.$refs.video.play();
          if (playing && playing.catch) playing.catch(() => {});
        }
      });
    },

    dismissOutside(event) {
      if (event.target !== this.$root || event.button !== 0 || event.detail === 0) return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const box = this.$root.getBoundingClientRect();
      const outside = event.clientX < box.left || event.clientX > box.right ||
        event.clientY < box.top || event.clientY > box.bottom;
      if (outside) this.$root.close();
    },

    finishClose() {
      const opener = this._opener;
      if (this.$refs.video) {
        this.$refs.video.pause();
        this.$refs.video.removeAttribute('src');
        this.$refs.video.load();
      }
      if (opener && opener.isConnected) {
        opener.setAttribute('aria-expanded', 'false');
        opener.removeAttribute('aria-controls');
        opener.setAttribute('data-state', 'closed');
      }
      this.src = '';
      this._opener = null;
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    },
  }));
});

/* Compose every consumer-owned video trigger with the one page-local Dialog. */
document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-hd-video]');
  if (!trigger) return;
  event.preventDefault();
  window.dispatchEvent(new CustomEvent('hd-open-video', {
    detail: {
      src: trigger.getAttribute('data-hd-video'),
      trigger,
    },
  }));
});

/* Ambient hero loops (uiux): a short, muted design B-roll clip replaces the static
   poster on camps that ship hero.video_loop. It is deliberately NOT `autoplay` in
   markup — playback is gated on prefers-reduced-motion here so motion-sensitive
   visitors keep the still poster (WCAG 2.2.2, Pause/Stop/Hide). The overlay play
   button opens the full narrated intro (with sound) through the modal above. */
(function () {
  var loops = document.querySelectorAll('video.hd-camp-loop');
  if (!loops.length || !window.matchMedia) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  loops.forEach(function (v) {
    var play = function () {
      if (reduce.matches) return;
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    };
    if (v.readyState >= 2) play();
    else v.addEventListener('loadeddata', play, { once: true });
    if (reduce.addEventListener) {
      reduce.addEventListener('change', function (e) { e.matches ? v.pause() : play(); });
    }
  });
})();
