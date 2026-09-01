"use client";

import { useEffect } from "react";

/** Registers the offline cache. Nothing else depends on it, so a failure here
    (private mode, http://) just means the app isn't installable — not broken.

    Production only. sw.js serves /_next/static/* cache-first, which in dev
    means the first stylesheet the worker sees is the one you keep getting —
    every CSS edit silently does nothing until the cache is cleared by hand. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    } else {
      // tear down a worker registered by an earlier dev session, and the stale
      // assets it is still holding
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
      caches?.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
    }
  }, []);
  return null;
}
