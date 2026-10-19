import type { Metadata, Viewport } from "next";
import { Caveat, Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-caveat",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: "Memory Book",
  description: "A hand-made feeling baby journal, kept safe in your own Google Drive.",
};

export const viewport: Viewport = {
  themeColor: "#ece3d6",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${caveat.variable} ${cormorant.variable}`}>
      <body>{children}</body>
    </html>
  );
}
