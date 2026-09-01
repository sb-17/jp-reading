"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Story } from "@/lib/stories";
import { ruby } from "@/lib/ruby";
import { ThemeToggle } from "@/app/ThemeToggle";

const FURI = [
  ["all", "ふりがな：全部"],
  ["less", "ふりがな：少なめ"],
  ["off", "ふりがな：なし"],
] as const;

export function Reader({ story }: { story: Story }) {
  const [furi, setFuri] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);

  /* Read after mount, not in the initial state: the page is prerendered at
     build time, so touching localStorage during render would mismatch. */
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("jpreading:furi"));
      if (saved >= 0 && saved < FURI.length) setFuri(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cycleFuri = () => {
    const next = (furi + 1) % FURI.length;
    setFuri(next);
    try {
      localStorage.setItem("jpreading:furi", String(next));
    } catch {}
  };

  /* Turning English off clears the individually-tapped lines too, so the
     button always means what it says. */
  const toggleEnglish = () => {
    setShowAll((on) => !on);
    setRevealed(new Set());
  };

  const toggleLine = (key: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (!next.delete(key)) next.add(key);
      return next;
    });

  return (
    <div data-furi={FURI[furi][0]}>
      <div className="progress" style={{ width: `${progress}%` }} />

      <div className="bar">
        <Link className="chip" href="/" aria-label="Back to the story list">
          ←
        </Link>
        <div className="bar-title jp" lang="ja">
          {story.title}
          <small>{story.level}</small>
        </div>
        <button className={`chip${furi ? " on" : ""}`} onClick={cycleFuri}>
          {FURI[furi][1]}
        </button>
        <button className={`chip${showAll ? " on" : ""}`} onClick={toggleEnglish}>
          English
        </button>
        <ThemeToggle />
      </div>

      <main className="page">
        <div className="hero">
          <h1 className="jp" lang="ja">
            {story.title}
          </h1>
          <div className="sub">{story.subtitle}</div>
        </div>

        <div className="howto">
          <b>How to read this</b>
          <ul>
            <li>
              <b>Tap any Japanese line</b> to show its English, or use the{" "}
              <b>English</b> button for all of them.
            </li>
            <li>
              <b>ふりがな</b> cycles 全部 → 少なめ → なし. On 少なめ, readings stay only
              on names and on the kanji you aren&apos;t expected to know yet.
            </li>
            <li>Each chapter ends with its new words and grammar.</li>
            <li>
              Don&apos;t look up everything. If you get the feeling of a sentence, keep
              going.
            </li>
          </ul>
        </div>

        {story.chapters.map((c, ci) => (
          <section className="chapter" key={ci}>
            <h2 className="ch-num jp" lang="ja">
              {ruby(c.n)}
            </h2>
            <h3 className="ch-title jp" lang="ja">
              {ruby(c.t)}
            </h3>

            {c.k && (
              <div className="newk">
                <div className="big" lang="ja">
                  {c.k[0]}
                </div>
                <div className="txt">
                  <span className="lbl">new kanji · あたらしい漢字</span>
                  <b lang="ja">{c.k[1]}</b> &nbsp;{c.k[2]}
                  <span className="ex" lang="ja">
                    {ruby(c.k[3])}
                  </span>
                </div>
              </div>
            )}

            {c.ja.map(([ja, en], li) => {
              const key = `${ci}:${li}`;
              return (
                <div key={key}>
                  <button
                    className={`line${ja.startsWith("「") ? " dialogue" : ""}`}
                    lang="ja"
                    onClick={() => toggleLine(key)}
                  >
                    {ruby(ja)}
                  </button>
                  {(showAll || revealed.has(key)) && <p className="line-en">{en}</p>}
                </div>
              );
            })}

            <div className="box">
              <h4 className="box-label">ことば · new words</h4>
              <table className="vocab">
                <tbody>
                  {c.v.map(([word, reading, meaning], i) => (
                    <tr key={i}>
                      <td className="w" lang="ja">
                        {word}
                      </td>
                      <td className="r" lang="ja">
                        {reading}
                      </td>
                      <td>{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="box">
              <h4 className="box-label">ぶんぽう · grammar</h4>
              {c.g.map(([pattern, meaning, example], i) => (
                <div className="grammar" key={i}>
                  <b lang="ja">{ruby(pattern)}</b> — {meaning}
                  <span className="ex" lang="ja">
                    {ruby(example)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div className="end" lang="ja">
          {ruby("終{お}わり")}
        </div>
      </main>
    </div>
  );
}
