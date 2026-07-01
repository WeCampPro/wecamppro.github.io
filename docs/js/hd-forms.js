/* hd-forms.js (W7.4) - AJAX submission for local remote forms.
   Keeps the native POST fallback intact when JS is unavailable. */
(function () {
  "use strict";

  var REMOTE_ACTION = /^https:\/\/(?:api\.web3forms\.com\/submit|formspree\.io\/f\/)/i;
  var SUCCESS_TEXT = "فرم با موفقیت ارسال شد. به‌زودی با شما تماس می‌گیریم.";
  var ERROR_TEXT = "خطایی رخ داد. لطفاً دوباره تلاش کنید.";

  function actionUrl(form) {
    try {
      return new URL(form.getAttribute("action") || "", document.baseURI).href;
    } catch (e) {
      return "";
    }
  }

  function isRemoteForm(form) {
    return REMOTE_ACTION.test(actionUrl(form));
  }

  function formWrap(form) {
    return (
      form.closest(".hd-form-wrap") ||
      form.closest("[data-hd-form-wrap]") ||
      form.parentElement
    );
  }

  function ensureState(form, className, text) {
    var wrap = formWrap(form);
    if (!wrap) return null;

    var state = wrap.querySelector("." + className);
    if (state) return state;

    state = document.createElement("div");
    state.className = className;
    state.setAttribute("aria-live", "polite");
    state.textContent = text;
    form.insertAdjacentElement("afterend", state);
    return state;
  }

  function setState(form, state) {
    var wrap = formWrap(form);
    if (!wrap) return;

    wrap.classList.toggle("is-success", state === "success");
    wrap.classList.toggle("is-error", state === "error");
    wrap.classList.toggle("is-submitting", state === "submitting");

    var success = ensureState(form, "hd-form-success", SUCCESS_TEXT);
    var error = ensureState(form, "hd-form-error", ERROR_TEXT);
    if (success) success.setAttribute("aria-hidden", state === "success" ? "false" : "true");
    if (error) error.setAttribute("aria-hidden", state === "error" ? "false" : "true");
  }

  function submitControls(form) {
    return Array.prototype.slice.call(
      form.querySelectorAll('button[type="submit"], input[type="submit"]')
    );
  }

  function setSubmitting(form, submitting) {
    form.toggleAttribute("aria-busy", submitting);
    submitControls(form).forEach(function (control) {
      control.disabled = submitting;
    });
  }

  function field(form, name) {
    var elements = form.elements[name];
    if (!elements) return null;
    return elements.length ? elements[0] : elements;
  }

  function applySubmitterVars(form, submitter) {
    if (!submitter) return;

    var subject = submitter.getAttribute("data-request-subject");
    var redirect = submitter.getAttribute("data-request-redirect");

    if (subject && field(form, "subject")) field(form, "subject").value = subject;
    if (redirect && field(form, "redirect")) field(form, "redirect").value = redirect;
  }

  async function responseOK(response) {
    if (!response.ok) return false;

    var contentType = response.headers.get("content-type") || "";
    if (contentType.indexOf("application/json") === -1) return true;

    try {
      var data = await response.clone().json();
      return data.success !== false && data.ok !== false;
    } catch (e) {
      return true;
    }
  }

  async function submitForm(event) {
    var form = event.currentTarget;
    if (!isRemoteForm(form)) return;

    event.preventDefault();

    if (form.dataset.hdSubmitting === "true") return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    applySubmitterVars(form, event.submitter);
    form.dataset.hdSubmitting = "true";
    setState(form, "submitting");
    setSubmitting(form, true);

    try {
      var response = await fetch(actionUrl(form), {
        method: form.getAttribute("method") || "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });

      if (!(await responseOK(response))) throw new Error("Form submission failed");

      form.hidden = true;
      form.setAttribute("data-hd-submitted", "true");
      setState(form, "success");
    } catch (e) {
      setState(form, "error");
    } finally {
      delete form.dataset.hdSubmitting;
      setSubmitting(form, false);
    }
  }

  function init() {
    document.querySelectorAll("form").forEach(function (form) {
      if (!isRemoteForm(form) || form.dataset.hdFormBound === "true") return;
      form.dataset.hdFormBound = "true";
      ensureState(form, "hd-form-success", SUCCESS_TEXT).setAttribute("aria-hidden", "true");
      ensureState(form, "hd-form-error", ERROR_TEXT).setAttribute("aria-hidden", "true");
      form.addEventListener("submit", submitForm);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
