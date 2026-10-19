import type { Metadata, Viewport } from "next";
import { Caveat, Cormorant_Garamond, Courier_Prime, Indie_Flower, Kalam, Lora, Patrick_Hand, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/app/ServiceWorker";

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

// The app around the book: a clean, modern sans.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-jakarta" });

// Alternative handwriting fonts, chosen in Settings.
const kalam = Kalam({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-kalam" });
const patrick = Patrick_Hand({ subsets: ["latin"], weight: "400", variable: "--font-patrick" });
const indie = Indie_Flower({ subsets: ["latin"], weight: "400", variable: "--font-indie" });
const courier = Courier_Prime({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-courier" });
const lora = Lora({ subsets: ["latin"], weight: ["400", "600"], style: ["normal", "italic"], variable: "--font-lora" });

export const metadata: Metadata = {
  title: "Memory Book",
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
  themeColor: "#faf7f4",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${caveat.variable} ${cormorant.variable} ${kalam.variable} ${patrick.variable} ${indie.variable} ${lora.variable} ${courier.variable}`}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
