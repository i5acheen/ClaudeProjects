// Copies the iPhone-photo (HEIC) decoder into public/, so the browser can load it
// on demand inside its own sandboxed worker (see public/heic-worker.js).
// libheif is LGPL-3.0: it's shipped unmodified, as a separate file, with its licence.
import { cpSync, mkdirSync } from "node:fs";

mkdirSync("public/vendor/libheif", { recursive: true });
cpSync("node_modules/libheif-js/libheif/libheif.js", "public/vendor/libheif/libheif.js");
cpSync("node_modules/libheif-js/libheif/LICENSE", "public/vendor/libheif/LICENSE");
