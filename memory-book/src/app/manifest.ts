import type { MetadataRoute } from "next";

/** Lets people add Memory Book to their home screen, where it opens like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Memory Book",
    short_name: "Memory Book",
    description: "A hand-made feeling baby journal, kept safe in your own Google Drive.",
    start_url: "/book",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fbf7f2",
    theme_color: "#fbf7f2",
    categories: ["lifestyle", "photo"],
    // Android: "Share → Memory Book" from the gallery (handled on the phone by public/sw.js).
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: { files: [{ name: "photos", accept: ["image/*", ".jpg", ".jpeg", ".png", ".webp", ".heic"] }] },
    },
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Write", url: "/book/write", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Timeline", url: "/book/timeline", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
