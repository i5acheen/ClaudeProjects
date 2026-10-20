/**
 * The page's Content-Security-Policy: the list of places the page may load
 * code, images and data from. Anything else is blocked by the browser, so even
 * if a bug ever let someone slip their own script into the page, it couldn't
 * run or send your Google key anywhere.
 */
export function contentSecurityPolicy(nonce: string, dev = false): string {
  const google = "https://www.googleapis.com https://content.googleapis.com https://*.googleusercontent.com";
  return [
    "default-src 'self'",
    // Only our own scripts (marked with this request's nonce) and what they load.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes are used for page layout (tilts, sizes); styles can't run code.
    "style-src 'self' 'unsafe-inline' https://www.gstatic.com",
    "img-src 'self' blob: data: https://*.googleusercontent.com https://ssl.gstatic.com https://www.gstatic.com https://drive-thirdparty.googleusercontent.com",
    "font-src 'self' data:",
    // The browser talks only to us and to Google Drive.
    `connect-src 'self' ${google}`,
    // Google's own file picker opens in a frame.
    "frame-src https://docs.google.com https://drive.google.com https://accounts.google.com https://content.googleapis.com",
    // The iPhone (HEIC) photo decoder runs in its own sandboxed worker (public/heic-worker.js).
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com",
    // No other website may show this app inside its own page.
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Headers sent with every response (pages, files, sign-in). */
export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
