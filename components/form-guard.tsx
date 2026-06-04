"use client";

import { useEffect } from "react";

const labelControlSelector =
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]), select, textarea';

const invalidControlSelector =
  'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):invalid, select:invalid, textarea:invalid';

function shouldSkipOptionalMarker(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  if (!(control instanceof HTMLInputElement)) return false;
  return control.type === "checkbox" || control.type === "radio";
}

function firstLabelText(label: HTMLLabelElement) {
  const directSpan = Array.from(label.children).find((child) => child.tagName.toLowerCase() === "span");
  if (directSpan instanceof HTMLElement) return directSpan;
  return label.querySelector<HTMLElement>("span");
}

function updateFieldLabels(root: ParentNode = document) {
  root.querySelectorAll("label").forEach((label) => {
    const control = label.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(labelControlSelector);
    const text = firstLabelText(label);

    if (!control || !text) return;

    text.classList.remove("field-label-required", "field-label-optional");

    if (control.required) {
      text.classList.add("field-label-required");
      control.setAttribute("aria-required", "true");
      return;
    }

    control.removeAttribute("aria-required");
    if (!shouldSkipOptionalMarker(control)) {
      text.classList.add("field-label-optional");
    }
  });
}

function focusFirstInvalidField(form: HTMLFormElement) {
  const invalidField = form.querySelector<HTMLElement>(invalidControlSelector);
  invalidField?.focus({ preventScroll: false });
}

export function FormGuard() {
  useEffect(() => {
    updateFieldLabels();

    function handleSubmit(event: SubmitEvent) {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form || form.noValidate || form.checkValidity()) return;

      event.preventDefault();
      event.stopPropagation();
      form.reportValidity();
      focusFirstInvalidField(form);
    }

    const observer = new MutationObserver(() => updateFieldLabels());
    observer.observe(document.body, {
      attributeFilter: ["required", "type"],
      attributes: true,
      childList: true,
      subtree: true
    });

    document.addEventListener("submit", handleSubmit, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  return null;
}
