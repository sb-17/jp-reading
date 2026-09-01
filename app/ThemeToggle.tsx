"use client";

/** Flips dark/light and keeps <meta theme-color> in step so the phone's status
    bar matches the page. The initial value is applied by the boot script in
    layout.tsx — this only ever reacts to a tap, so it needs no state. */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const light = root.dataset.theme !== "light";
    root.dataset.theme = light ? "light" : "dark";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", light ? "#f6f7f9" : "#242424");
    try {
      localStorage.setItem("jpreading:theme", light ? "light" : "dark");
    } catch {}
  };

  return (
    <button className="chip" onClick={toggle} aria-label="Toggle light or dark theme">
      ◐
    </button>
  );
}
