import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ComplyTrail",
  description: "SOC 2 People Ops compliance evidence tracker",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
