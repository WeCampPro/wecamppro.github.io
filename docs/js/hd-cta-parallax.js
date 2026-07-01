/* hd-cta-parallax.js (W5.2.9) - restores the Webflow IX2 "Scroll Animations CTA"
   continuous movement after banner.html migrated to the HD layer.

   Ground truth from the archived Webflow runtime at a0c1437, action list a-43 / event e-520:
     image.cta-2: 0% 100px -> 90% -80px
     image.cta-3: 0%  40px -> 85% -40px
     image.cta-4: 0%  50px -> 85% -20px
     smoothing: 95

   Markup owns the keyframes through data-hd-cta-y so this script stays tiny and
   local. No Webflow, no jQuery, no CDN. */
(function () {
  "use strict";

  var SMOOTHING = 0.05; // Webflow smoothing 95 ~= move 5% toward target per frame.
  var MAX_START_ATTEMPTS = 240;

  var groups = [];
  var started = false;
  var ticking = false;
  var animating = false;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function parseKeyframes(value) {
    return value
      .split(",")
      .map(function (pair) {
        var parts = pair.split(":");
        return {
          progress: Number(parts[0]),
          y: Number(parts[1]),
        };
      })
      .filter(function (point) {
        return Number.isFinite(point.progress) && Number.isFinite(point.y);
      })
      .sort(function (a, b) {
        return a.progress - b.progress;
      });
  }

  function interpolate(points, progress) {
    if (!points.length) return 0;
    if (progress <= points[0].progress) return points[0].y;

    for (var i = 1; i < points.length; i++) {
      var prev = points[i - 1];
      var next = points[i];
      if (progress <= next.progress) {
        var span = next.progress - prev.progress;
        var t = span === 0 ? 1 : (progress - prev.progress) / span;
        return prev.y + (next.y - prev.y) * t;
      }
    }

    return points[points.length - 1].y;
  }

  function sectionProgress(section) {
    var rect = section.getBoundingClientRect();
    var viewport = window.innerHeight || document.documentElement.clientHeight;
    var travel = viewport + rect.height;
    if (travel <= 0) return 0;

    return clamp(((viewport - rect.top) / travel) * 100, 0, 100);
  }

  function collectGroups() {
    var sections = Array.prototype.slice.call(
      document.querySelectorAll("[data-hd-cta-parallax]")
    );

    return sections
      .map(function (section) {
        var layers = Array.prototype.slice
          .call(section.querySelectorAll("[data-hd-cta-y]"))
          .map(function (el) {
            return {
              el: el,
              points: parseKeyframes(el.getAttribute("data-hd-cta-y") || ""),
            };
          })
          .filter(function (layer) {
            return layer.points.length;
          });

        var progress = sectionProgress(section);
        return {
          section: section,
          layers: layers,
          progress: progress,
          targetProgress: progress,
        };
      })
      .filter(function (group) {
        return group.layers.length;
      });
  }

  function render() {
    var needsNextFrame = false;

    groups.forEach(function (group) {
      var delta = group.targetProgress - group.progress;

      if (Math.abs(delta) > 0.02) {
        group.progress += delta * SMOOTHING;
        needsNextFrame = true;
      } else {
        group.progress = group.targetProgress;
      }

      group.layers.forEach(function (layer) {
        var y = interpolate(layer.points, group.progress);
        layer.el.style.transform = "translate3d(0, " + y.toFixed(2) + "px, 0)";
      });
    });

    if (needsNextFrame) {
      window.requestAnimationFrame(render);
    } else {
      animating = false;
    }
  }

  function updateTargets() {
    ticking = false;

    groups.forEach(function (group) {
      group.targetProgress = sectionProgress(group.section);
    });

    if (!animating) {
      animating = true;
      window.requestAnimationFrame(render);
    }
  }

  function requestUpdate() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateTargets);
  }

  function init() {
    if (started) return true;

    if (
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return true;
    }

    groups = collectGroups();
    if (!groups.length) return false;

    started = true;
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("load", requestUpdate);
    render();
    requestUpdate();
    return true;
  }

  function start(attempt) {
    if (init()) return;

    if (attempt < MAX_START_ATTEMPTS) {
      window.requestAnimationFrame(function () {
        start(attempt + 1);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init, { once: true });
  window.addEventListener("load", init, { once: true });
  start(0);
})();
