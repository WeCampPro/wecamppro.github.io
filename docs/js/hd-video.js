/* hd-video.js (W3.3) — accessible video modal replacing the Webflow w-lightbox
   runtime and its embedded payloads. Reuses the WECORE hero-video.js modal
   pattern (open/close, body-scroll lock, focus trap, focus restore, pause-on-close),
   generalised to:
     - many triggers per page (the camp/course preview thumbnails), and
     - two media kinds: an inline <video> (local mp4) or an <iframe> (YouTube).

   A thumbnail opens the modal by firing a window event, translated from a data
   attribute by the delegated listener below:
     <button ... data-hd-video="/vid/x.mp4"            data-hd-video-kind="video">
     <button ... data-hd-video="https://…/embed/ID?…"  data-hd-video-kind="iframe">
   The modal markup (layouts/partials/video-modal.html) is a single shared
   instance; all styling is in hd.css §17 (.hd-modal-* / .hd-lightbox-thumb).

   Loaded as a NON-deferred <script> near the end of <body> so this `alpine:init`
   listener registers BEFORE the deferred Alpine core in <head> boots — the same
   ordering contract hd-tabs.js (W3.1) / hd-survey.js (W3.2) rely on. */
document.addEventListener('alpine:init', () => {
  Alpine.data('hdVideo', () => ({
    open: false,
    kind: '',        // 'video' | 'iframe'
    src: '',
    _opener: null,   // element to restore focus to on close
    _previousBodyOverflow: null,

    show(detail) {
      if (!detail || !detail.src) return;
      if (!this.open) {
        this._opener = document.activeElement;
        this._previousBodyOverflow = document.body.style.overflow;
      }
      this.kind = detail.kind === 'iframe' ? 'iframe' : 'video';
      this.src = detail.src;
      this.open = true;
      document.body.style.overflow = 'hidden';   // lock scroll behind the modal
      this.$nextTick(() => {
        // The <video>/<iframe> is created by x-if once `open` flips; play it now.
        // The opening click is a user gesture, so sound-on autoplay is allowed.
        if (this.kind === 'video' && this.$refs.video) {
          try { this.$refs.video.currentTime = 0; } catch (e) {}
          const playing = this.$refs.video.play();
          if (playing && playing.catch) playing.catch(() => {});
        }
        if (this.$refs.close) this.$refs.close.focus();
      });
    },

    close() {
      if (!this.open) return;
      // Flipping `open` removes the media via x-if, so playback (video AND iframe)
      // stops immediately — no lingering audio.
      this.open = false;
      this.src = '';
      this.kind = '';
      document.body.style.overflow = this._previousBodyOverflow || '';
      this._previousBodyOverflow = null;
      const opener = this._opener;
      this._opener = null;
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    },

    /* Manual focus trap (Alpine core ships no focus plugin). Mirrors WECORE
       hero-video.js: Tab / Shift+Tab wrap within the modal's visible focusables.
       (Focus inside a cross-origin YouTube iframe can't be trapped — a universal
       limitation; the <video> case is fully trapped.) */
    trap(e) {
      if (!this.open) return;
      const sel = 'a[href],button:not([disabled]),video[controls],iframe,[tabindex]:not([tabindex="-1"])';
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

/* Delegated trigger listener (mirrors hd-tabs.js's [data-open-tab] pattern): any
   [data-hd-video] click opens the shared modal with that video, translated into
   the window event the modal listens for — so the scattered thumbnails need no
   Alpine scope of their own. */
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-hd-video]');
  if (!trigger) return;
  e.preventDefault();
  window.dispatchEvent(new CustomEvent('hd-open-video', {
    detail: {
      src: trigger.getAttribute('data-hd-video'),
      kind: trigger.getAttribute('data-hd-video-kind') || 'video',
    },
  }));
});
