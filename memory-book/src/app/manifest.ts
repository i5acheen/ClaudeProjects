import type { MetadataRoute } from "next";
import { APP_NAME, SHORT_DESCRIPTION } from "@/content/marketing";

/** Lets people add Memory Book to their home screen, where it opens like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_NAME,
    short_name: APP_NAME,
    description: SHORT_DESCRIPTION,
    start_url: "/book",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f5eedc",
    theme_color: "#f5eedc",
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
