import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "./ServiceWorker";

export const metadata: Metadata = {
  title: "日本語を読む · JP Reading",
  description: "Graded Japanese stories with furigana and line-by-line English.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "読む", statusBarStyle: "black" },
  /* Same treatment as Kanjii's icon — #4da6ff plate, white bold gothic glyph —
     with 読 so the two are distinguishable in a tab strip. Keep the SVG first:
     browsers that support it prefer it and it stays sharp at any size. The .ico
     carries 16/32/48 because Google fetches /favicon.ico by convention. */
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.ico", sizes: "48x48" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#242424",
};

/* Resolve the saved theme before first paint, otherwise a light-mode reader
   gets a full-screen dark flash on every navigation. The two colours must
   match --bg in globals.css. */
const THEME_BOOT = `try{
  var p = localStorage.getItem("jpreading:theme") || "dark";
  var light = p === "light" || (p === "system" && matchMedia("(prefers-color-scheme: light)").matches);
  document.documentElement.dataset.theme = light ? "light" : "dark";
  document.querySelector('meta[name="theme-color"]').content = light ? "#f6f7f9" : "#242424";
}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
