<script>
document.addEventListener("DOMContentLoaded", function () {
  // Run only on mobile devices
  if (window.innerWidth <= 767) {

    // 1. Disable clicking on tab links
    document.querySelectorAll(".w-tab-link").forEach(link => {
      link.style.pointerEvents = "none";      // click disabled
      link.style.opacity = "0.4";             // optional styling
    });

    // 2. Show ALL tab panes stacked vertically
    document.querySelectorAll(".w-tab-pane").forEach(pane => {
      pane.style.display = "block";
      pane.style.opacity = "1";
      pane.style.visibility = "visible";
      pane.classList.add("mobile-pane-visible");
    });

    // 3. Remove the Webflow active-tab class
    document.querySelectorAll(".w-tab-pane.w--tab-active")
      .forEach(pane => pane.classList.remove("w--tab-active"));
  }
});
</script>
