/* hd-snap-slider.js (W3.2) — controls for the CSS scroll-snap carousels that
   replace the Webflow w-slider runtime. Reused from WECORE and extended
   here with optional dot indicators + looping so it can reproduce the Webflow
   slider on about/single.html (prev/next arrows + a w-slider-nav of dots).

   Engine is markup-driven and fully backward compatible with the WECORE usages
   (.home_reviews_* / .about_story_*), which opt out of the new features simply by
   not carrying the [data-hd-slider-dots] / [data-hd-slider-loop] hooks:

     wrapper   .hd-snap-slider            (position:relative; styled by hd.css §16)
               [data-hd-slider-loop]      optional — arrows wrap past the ends
     track     .hd-snap-track             (the scroll-snap container)
     slide     .hd-snap-slide             (flex 0 0 100%)
     prev/next [data-hd-slider-prev/next] (any element; role=button gets keyboard)
     dots      [data-hd-slider-dots]      optional — host that JS fills with one
                                          .hd-snap-dot button per slide (the
                                          Webflow w-slider-nav used to build)

   Navigation is index-based (move to the neighbouring slide) rather than a raw
   scrollBy, so the active dot stays in sync. getBoundingClientRect math keeps it
   correct in both LTR and RTL. */
(function () {
  "use strict";

  function getTrack(slider) {
    return slider.querySelector(".hd-snap-track, .home_reviews_mask");
  }

  function getSlides(track) {
    return Array.prototype.slice.call(
      track.querySelectorAll(".hd-snap-slide, .home_reviews_slide")
    );
  }

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* Index of the slide whose start edge is nearest the track's start edge.
     Distance via getBoundingClientRect so it holds under both directions. */
  function activeIndex(track) {
    var slides = getSlides(track);
    if (!slides.length) return 0;
    var base = track.getBoundingClientRect().left;
    var best = 0,
      min = Infinity;
    for (var i = 0; i < slides.length; i++) {
      var d = Math.abs(slides[i].getBoundingClientRect().left - base);
      if (d < min) {
        min = d;
        best = i;
      }
    }
    return best;
  }

  function goTo(track, index, loop) {
    var slides = getSlides(track);
    if (!slides.length) return;
    var n = slides.length;
    index = loop
      ? ((index % n) + n) % n
      : Math.max(0, Math.min(n - 1, index));
    var delta =
      slides[index].getBoundingClientRect().left -
      track.getBoundingClientRect().left;
    track.scrollBy({
      left: delta,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function setupSlider(slider) {
    var track = getTrack(slider);
    if (!track) return;
    var loop = slider.hasAttribute("data-hd-slider-loop");

    function bindArrow(button, direction) {
      function activate() {
        goTo(track, activeIndex(track) + direction, loop);
      }
      button.addEventListener("click", activate);
      /* Non-button controls are not keyboard-operable on their own. */
      if (button.getAttribute("role") === "button") {
        button.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
            e.preventDefault();
            activate();
          }
        });
      }
    }

    slider.querySelectorAll("[data-hd-slider-prev]").forEach(function (b) {
      bindArrow(b, -1);
    });
    slider.querySelectorAll("[data-hd-slider-next]").forEach(function (b) {
      bindArrow(b, 1);
    });

    /* Optional dot indicators — generated one per slide (reproduces the Webflow
       w-slider-nav that the old runtime used to populate). Clicking a dot scrolls to its
       slide; the active dot follows the scroll position. */
    var dotsHost = slider.querySelector("[data-hd-slider-dots]");
    if (dotsHost) {
      var slides = getSlides(track);
      var dots = slides.map(function (_, i) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "hd-snap-dot";
        dot.setAttribute("aria-label", "اسلاید " + (i + 1));
        dot.addEventListener("click", function () {
          goTo(track, i, loop);
        });
        dotsHost.appendChild(dot);
        return dot;
      });

      var sync = function () {
        var cur = activeIndex(track);
        for (var i = 0; i < dots.length; i++) {
          dots[i].classList.toggle("is-active", i === cur);
          dots[i].setAttribute("aria-current", i === cur ? "true" : "false");
        }
      };
      sync();

      var raf = null;
      track.addEventListener(
        "scroll",
        function () {
          if (raf) return;
          raf = requestAnimationFrame(function () {
            raf = null;
            sync();
          });
        },
        { passive: true }
      );
      window.addEventListener("resize", sync);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    document
      .querySelectorAll(".hd-snap-slider, .home_reviews_slider")
      .forEach(setupSlider);
  });
})();
