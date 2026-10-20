import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Caveat, Cormorant_Garamond, Courier_Prime, Indie_Flower, Kalam, Lora, Patrick_Hand, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/app/ServiceWorker";

// Variable fonts (no fixed weights): one file each covers every weight, so pages load fewer files.
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat" });

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
});

// The app around the book: a clean, modern sans.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

// Alternative handwriting fonts, chosen in Settings: not preloaded, fetched only when used.
const kalam = Kalam({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-kalam", preload: false });
const patrick = Patrick_Hand({ subsets: ["latin"], weight: "400", variable: "--font-patrick", preload: false });
const indie = Indie_Flower({ subsets: ["latin"], weight: "400", variable: "--font-indie", preload: false });
const courier = Courier_Prime({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-courier", preload: false });
const lora = Lora({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-lora", preload: false });

// Vercel preview deployments are the test version (staging): marked as such and kept out of search engines.
const isPreview = process.env.VERCEL_ENV === "preview";

export const metadata: Metadata = {
  title: "Memory Book",
  ...(isPreview ? { robots: { index: false, follow: false } } : {}),
  description: "A hand-made feeling baby journal, kept safe in your own Google Drive.",
  applicationName: "Memory Book",
  appleWebApp: { capable: true, title: "Memory Book", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#f7f5f2",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Every page is rendered per request, so its scripts carry that request's CSP nonce.
  await headers();
  return (
    <html lang="en" className={`${jakarta.variable} ${caveat.variable} ${cormorant.variable} ${kalam.variable} ${patrick.variable} ${indie.variable} ${lora.variable} ${courier.variable}`}>
      <body>
        {children}
        {isPreview && (
          <div
            role="note"
            className="pointer-events-none fixed bottom-2 left-2 z-[100] rounded-full bg-amber-300 px-3 py-1 text-xs font-semibold text-amber-950 shadow"
          >
            Test version
          </div>
        )}
        <ServiceWorker />
      </body>
    </html>
  );
}
