/* hd-forms.js (RA-1) - bounded, localized submission for remote forms.
   The native POST remains the no-JavaScript fallback. Remote requests time out
   after 12 seconds and are never retried automatically. */
(function () {
  "use strict";

  var REMOTE_ACTION = /^https:\/\/(?:api\.web3forms\.com\/submit|formspree\.io\/f\/)/i;
  var REQUEST_TIMEOUT_MS = 12000;
  var SUCCESS_TEXT = "فرم با موفقیت ارسال شد. به‌زودی با شما تماس می‌گیریم.";
  var ERROR_TEXT = "فرم ارسال نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.";
  var TIMEOUT_TEXT = "ارسال فرم بیش از حد معمول طول کشید. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید.";
  var CONTACT_EMAIL = "we@wecamp.pro";
  var CONTACT_PHONE = "۰۲۱-۸۲۸۰۲۲۶۴";
  var CONTACT_PHONE_HREF = "tel:02182802264";
  var STATE_CLASSES = ["is-idle", "is-invalid", "is-submitting", "is-success", "is-error"];
  var generatedId = 0;

  function actionUrl(form) {
    try {
      return new URL(form.getAttribute("action") || "", document.baseURI).href;
    } catch (error) {
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
    if (!state) {
      state = document.createElement("div");
      state.className = className;
      state.textContent = text;
      form.insertAdjacentElement("afterend", state);
    }

    state.setAttribute("tabindex", "-1");
    if (className === "hd-form-error") {
      state.setAttribute("role", "alert");
      state.setAttribute("aria-live", "assertive");
    } else {
      state.setAttribute("role", "status");
      state.setAttribute("aria-live", "polite");
    }
    return state;
  }

  function renderError(state, timedOut) {
    if (!state) return;

    state.replaceChildren();
    state.appendChild(document.createTextNode((timedOut ? TIMEOUT_TEXT : ERROR_TEXT) + " اگر مشکل ادامه داشت، با "));

    var email = document.createElement("a");
    email.href = "mailto:" + CONTACT_EMAIL;
    email.textContent = CONTACT_EMAIL;
    state.appendChild(email);

    state.appendChild(document.createTextNode(" یا "));
    var phone = document.createElement("a");
    phone.href = CONTACT_PHONE_HREF;
    phone.textContent = CONTACT_PHONE;
    state.appendChild(phone);
    state.appendChild(document.createTextNode(" تماس بگیرید."));
  }

  function submitControls(form) {
    return Array.prototype.slice.call(
      form.querySelectorAll('button[type="submit"], input[type="submit"]')
    );
  }

  function setState(form, state, detail) {
    var wrap = formWrap(form);
    var success = ensureState(form, "hd-form-success", SUCCESS_TEXT);
    var error = ensureState(form, "hd-form-error", ERROR_TEXT);
    var submitting = state === "submitting";
    var terminal = state === "success";

    form.dataset.hdState = state;
    if (wrap) {
      STATE_CLASSES.forEach(function (className) {
        wrap.classList.remove(className);
      });
      wrap.classList.add("is-" + state);
    }

    if (success) success.setAttribute("aria-hidden", terminal ? "false" : "true");
    if (error) error.setAttribute("aria-hidden", state === "error" ? "false" : "true");
    if (state === "error") renderError(error, detail && detail.timedOut);

    form.toggleAttribute("aria-busy", submitting);
    form.hidden = terminal;
    submitControls(form).forEach(function (control) {
      control.disabled = submitting || terminal;
    });

    return terminal ? success : state === "error" ? error : null;
  }

  function focusElement(element) {
    if (!element) return;
    try {
      element.focus({ preventScroll: true });
    } catch (error) {
      element.focus();
    }
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

  function asciiDigits(value) {
    var persian = "۰۱۲۳۴۵۶۷۸۹";
    var arabic = "٠١٢٣٤٥٦٧٨٩";
    return String(value || "").replace(/[۰-۹٠-٩]/g, function (digit) {
      var index = persian.indexOf(digit);
      return String(index === -1 ? arabic.indexOf(digit) : index);
    });
  }

  /* Canonical mobile payload: local Iranian 09 followed by nine ASCII digits. */
  function normalizeMobile(value) {
    var compact = asciiDigits(value).trim().replace(/[\s().-]+/g, "");
    if (/^00989\d{9}$/.test(compact)) compact = "0" + compact.slice(4);
    else if (/^\+989\d{9}$/.test(compact)) compact = "0" + compact.slice(3);
    else if (/^989\d{9}$/.test(compact)) compact = "0" + compact.slice(2);
    else if (/^9\d{9}$/.test(compact)) compact = "0" + compact;
    return /^09\d{9}$/.test(compact) ? compact : "";
  }

  function validationControls(form) {
    return Array.prototype.filter.call(
      form.querySelectorAll("input, select, textarea"),
      function (control) {
        return control.willValidate && !control.disabled && control.getAttribute("aria-hidden") !== "true";
      }
    );
  }

  function errorId(control) {
    if (!control.id) {
      generatedId += 1;
      control.id = "hd-form-field-" + generatedId;
    }
    return control.id + "--error";
  }

  function describedByTokens(control) {
    return (control.getAttribute("aria-describedby") || "")
      .split(/\s+/)
      .filter(Boolean);
  }

  function clearFieldError(control) {
    var id = errorId(control);
    var error = document.getElementById(id);
    if (error) error.remove();

    var tokens = describedByTokens(control).filter(function (token) {
      return token !== id;
    });
    if (tokens.length) control.setAttribute("aria-describedby", tokens.join(" "));
    else control.removeAttribute("aria-describedby");
    control.removeAttribute("aria-invalid");
    control.setCustomValidity("");
  }

  function messageFor(control, validity) {
    if (validity.valueMissing) return "تکمیل این فیلد الزامی است.";
    if (control.type === "email" && validity.typeMismatch) return "ایمیل را با قالب درست وارد کنید؛ مانند name@example.com.";
    if (control.type === "url" && validity.typeMismatch) return "نشانی را کامل و با http:// یا https:// وارد کنید.";
    if (control.type === "tel") return "شماره موبایل ایران را با قالب ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.";
    if (validity.tooShort) return "متن واردشده کوتاه‌تر از حد مجاز است.";
    if (validity.tooLong) return "متن واردشده بلندتر از حد مجاز است.";
    if (validity.patternMismatch || validity.typeMismatch || validity.badInput) return "مقدار این فیلد را با قالب درست وارد کنید.";
    return "مقدار این فیلد معتبر نیست.";
  }

  function showFieldError(control, message) {
    var id = errorId(control);
    var error = document.getElementById(id);
    if (!error) {
      error = document.createElement("p");
      error.id = id;
      error.className = "hts-text hts-field-error hd-field-error";
      error.setAttribute("data-role", "body-sm");
      error.setAttribute("data-tone", "danger");
      error.setAttribute("role", "alert");
      control.insertAdjacentElement("afterend", error);
    }
    error.textContent = message;

    var tokens = describedByTokens(control);
    if (tokens.indexOf(id) === -1) tokens.push(id);
    control.setAttribute("aria-describedby", tokens.join(" "));
    control.setAttribute("aria-invalid", "true");
    control.setCustomValidity(message);
  }

  function validateField(control) {
    clearFieldError(control);

    if (control.type === "tel" && control.value) {
      var normalized = normalizeMobile(control.value);
      if (!normalized) {
        showFieldError(control, "شماره موبایل ایران را با قالب ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.");
        return false;
      }
      return true;
    }

    if (control.checkValidity()) return true;
    showFieldError(control, messageFor(control, control.validity));
    return false;
  }

  function validateForm(form) {
    var firstInvalid = null;
    validationControls(form).forEach(function (control) {
      if (!validateField(control) && !firstInvalid) firstInvalid = control;
    });
    return firstInvalid;
  }

  function payloadFor(form) {
    var payload = new FormData(form);
    validationControls(form).forEach(function (control) {
      if (control.type !== "tel" || !control.name || !control.value) return;
      var normalized = normalizeMobile(control.value);
      if (normalized) payload.set(control.name, normalized);
    });
    return payload;
  }

  function timeoutFor(form) {
    var override = Number(form.dataset.hdTimeoutMs);
    return Number.isFinite(override) && override > 0
      ? Math.max(100, override)
      : REQUEST_TIMEOUT_MS;
  }

  async function responseOK(response) {
    if (!response.ok) return false;

    var contentType = response.headers.get("content-type") || "";
    if (contentType.indexOf("application/json") === -1) return true;

    try {
      var data = await response.clone().json();
      return data.success !== false && data.ok !== false;
    } catch (error) {
      return false;
    }
  }

  async function submitForm(event) {
    var form = event.currentTarget;
    if (!isRemoteForm(form)) return;

    event.preventDefault();
    if (form.dataset.hdSubmitted === "true" || form.dataset.hdSubmitting === "true") return;

    applySubmitterVars(form, event.submitter);
    var firstInvalid = validateForm(form);
    if (firstInvalid) {
      setState(form, "invalid");
      focusElement(firstInvalid);
      return;
    }

    var controller = new AbortController();
    var timedOut = false;
    var timer = window.setTimeout(function () {
      timedOut = true;
      controller.abort();
    }, timeoutFor(form));

    form.dataset.hdSubmitting = "true";
    setState(form, "submitting");

    try {
      var response = await fetch(actionUrl(form), {
        method: form.getAttribute("method") || "POST",
        headers: { Accept: "application/json" },
        body: payloadFor(form),
        signal: controller.signal,
      });

      if (!(await responseOK(response))) throw new Error("Remote form rejected the submission");

      form.dataset.hdSubmitted = "true";
      delete form.dataset.hdSubmitting;
      focusElement(setState(form, "success"));
    } catch (error) {
      delete form.dataset.hdSubmitting;
      focusElement(setState(form, "error", { timedOut: timedOut }));
    } finally {
      window.clearTimeout(timer);
    }
  }

  function bindValidation(form) {
    validationControls(form).forEach(function (control) {
      control.addEventListener("input", function () {
        if (control.hasAttribute("aria-invalid") || document.getElementById(errorId(control))) {
          validateField(control);
        }
      });
      control.addEventListener("change", function () {
        if (control.hasAttribute("aria-invalid")) validateField(control);
      });
    });
  }

  function init() {
    document.querySelectorAll("form").forEach(function (form) {
      if (!isRemoteForm(form) || form.dataset.hdFormBound === "true") return;
      form.dataset.hdFormBound = "true";
      form.noValidate = true;
      ensureState(form, "hd-form-success", SUCCESS_TEXT).setAttribute("aria-hidden", "true");
      ensureState(form, "hd-form-error", ERROR_TEXT).setAttribute("aria-hidden", "true");
      bindValidation(form);
      setState(form, "idle");
      form.addEventListener("submit", submitForm);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
