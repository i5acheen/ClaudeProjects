const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Escapes text and highlights any [PLACEHOLDER] so it's easy to spot on the page. */
export const ph = (text: string) =>
  escapeHtml(text).replace(/\[[^\]]+\]/g, (m) => `<mark class="placeholder">${m}</mark>`);

/** True while a value is still a [PLACEHOLDER]. */
export const isPlaceholder = (text: string) => /\[[^\]]*\]/.test(text);

/** Escapes text and turns {curly-braced} parts into an accent-coloured highlight. */
export const hl = (text: string) =>
  escapeHtml(text).replace(/\{([^}]+)\}/g, '<span class="highlight">$1</span>');

/** Removes {curly braces} for plain-text uses (meta tags, aria labels). */
export const plain = (text: string) => text.replace(/[{}]/g, "");
