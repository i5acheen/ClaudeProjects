const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Escapes text and highlights any [PLACEHOLDER] so it's easy to spot on the page. */
export const ph = (text: string) =>
  escapeHtml(text).replace(/\[[^\]]+\]/g, (m) => `<mark class="placeholder">${m}</mark>`);

/** True while a value is still a [PLACEHOLDER]. */
export const isPlaceholder = (text: string) => /\[[^\]]*\]/.test(text);
