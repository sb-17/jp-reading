import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "./ServiceWorker";

export const metadata: Metadata = {
  title: "日本語を読む · JP Reading",
  description: "Graded Japanese stories with furigana and line-by-line English.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "読む", statusBarStyle: "black" },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
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
