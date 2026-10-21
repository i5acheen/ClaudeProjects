import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { APP_NAME, TAGLINE, SUBTAGLINE } from "@/content/marketing";

/** The picture shown when the site's link is shared (WhatsApp, Instagram, Messages…). */
export const alt = `${APP_NAME} — ${TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Under the sample photo (from the demo book). */
const PHOTO_CAPTION = "Little Mira";

/** A Google font, just the letters this image uses; none (the default font) if it can't be fetched. */
async function googleFont(family: string, weight: number, text: string) {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

const dataUrl = async (file: string, type: string) =>
  `data:${type};base64,${(await readFile(join(process.cwd(), "public", file))).toString("base64")}`;

export default async function OpenGraphImage() {
  const [heading, hand, logo, photo] = await Promise.all([
    googleFont("Fredoka", 600, `${APP_NAME}${TAGLINE}`),
    googleFont("Caveat", 600, `${SUBTAGLINE}${PHOTO_CAPTION}`),
    dataUrl("icons/app-icon.svg", "image/svg+xml"),
    dataUrl("demo/ai-baby.jpg", "image/jpeg"),
  ]);
  const fonts = [
    ...(heading ? [{ name: "Fredoka", data: heading, weight: 600 as const }] : []),
    ...(hand ? [{ name: "Caveat", data: hand, weight: 600 as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 72px",
          background: "linear-gradient(180deg, #cfe8fb 0%, #e3f2fc 62%, #fffaf0 100%)",
          color: "#2b2d42",
          fontFamily: "Fredoka",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1, paddingRight: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 38, fontWeight: 600 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={68} height={68} alt="" />
            {APP_NAME}
          </div>
          <div style={{ marginTop: 40, fontSize: 70, fontWeight: 600, lineHeight: 1.08, letterSpacing: -1 }}>{TAGLINE}</div>
          <div style={{ marginTop: 22, fontSize: 44, fontFamily: "Caveat", color: "#4a4e69" }}>{SUBTAGLINE}</div>
          <div style={{ display: "flex", marginTop: 36, width: 120, height: 12, borderRadius: 12, background: "#ffcd3c" }} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: 330,
            padding: "18px 18px 0",
            background: "#ffffff",
            borderRadius: 6,
            transform: "rotate(4deg)",
            boxShadow: "0 24px 48px rgba(43,45,66,0.22)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} width={294} height={330} alt="" style={{ objectFit: "cover", borderRadius: 2 }} />
          <div style={{ display: "flex", padding: "14px 0 18px", fontSize: 36, fontFamily: "Caveat", color: "#4a4e69" }}>
            {PHOTO_CAPTION}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
