<script>
document.addEventListener('DOMContentLoaded', () => {
  // 1. تمام پنل‌ها را همیشه نمایش بده
  document.querySelectorAll('.w-tab-pane').forEach(pane => {
    pane.style.display = 'block';
    pane.style.opacity = '1';
    pane.style.visibility = 'visible';
    pane.classList.remove('w--tab-active'); // حذف حالت فعال
  });

  // 2. تب‌ها را به لینک اسکرول تبدیل کن
  document.querySelectorAll('[data-w-tab]').forEach((tab, index) => {
    const name = tab.getAttribute('data-w-tab');
    const sectionId = 'section-' + name;

    // بخش هدف را پیدا کن و ID اضافه کن
    const pane = document.querySelector(`.w-tab-pane[data-w-tab="${name}"]`);
    if (pane) pane.id = sectionId;

    // تبدیل تب به لینک اسکرول
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    });

    // استایل فعال را غیرفعال کن
    tab.classList.remove('w--tab-active');
  });

  // 3. خود Webflow Tabs را به‌طور کامل غیرفعال کن
  const tabWrap = document.querySelector('.w-tabs');
  if (tabWrap) {
    tabWrap.classList.remove('w-tabs');
    tabWrap.classList.remove('w-tab-menu');
    tabWrap.classList.remove('w-tab-content');
  }
});
</script>
