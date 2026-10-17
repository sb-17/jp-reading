"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Story } from "@/lib/stories";
import { plain, ruby } from "@/lib/ruby";
import { ThemeToggle } from "@/app/ThemeToggle";

const FURI = [
  ["all", "ふりがな：全部"],
  ["less", "ふりがな：少なめ"],
  ["off", "ふりがな：なし"],
] as const;

/* Playback speed, on top of whatever pace the narration was generated at.
   Browsers keep the pitch when changing it, so slower doesn't go deeper. */
const RATES = [1, 0.85, 0.7, 1.2];

export function Reader({ story }: { story: Story }) {
  const [ch, setCh] = useState(0);
  const [furi, setFuri] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [rate, setRate] = useState(0);
  /** the line being spoken, and whether playback runs on to the next one */
  const [speaking, setSpeaking] = useState<{ line: number; chain: boolean } | null>(null);

  const audio = useRef<HTMLAudioElement | null>(null);
  /** narration URL -> object URL, filled ahead of time (see the prefetch below) */
  const blobs = useRef(new Map<string, string>());
  /** where Listen picks up after a Stop */
  const resumeAt = useRef(0);

  const chapter = story.chapters[ch];
  const chapterKey = `jpreading:ch:${story.slug}`;
  const rateKey = `jpreading:rate:${story.slug}`;

  /* Read after mount, not in the initial state: the page is prerendered at
     build time, so touching localStorage during render would mismatch. The
     hash wins over the saved chapter so a reload stays where it was. */
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("jpreading:furi"));
      if (saved >= 0 && saved < FURI.length) setFuri(saved);
      const savedRate = Number(localStorage.getItem(rateKey));
      if (savedRate > 0 && savedRate < RATES.length) setRate(savedRate);
    } catch {}
    let start = Number(location.hash.slice(1)) - 1;
    if (!(start >= 0)) {
      try {
        start = Number(localStorage.getItem(chapterKey));
      } catch {}
    }
    if (start > 0 && start < story.chapters.length) setCh(start);
  }, [chapterKey, rateKey, story.chapters.length]);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Fetch the chapter's narration up front. iOS only lets audio start inside
     the tap that asked for it, and an await before play() is outside it — so
     the files have to be in hand already. Fetching rather than pointing the
     <audio> at the URL also keeps Safari's Range requests away from the
     service worker, which can only answer them from cache with the whole file. */
  useEffect(() => {
    for (const url of chapter.audio ?? []) {
      if (!url || blobs.current.has(url)) continue;
      fetch(url)
        .then((r) => (r.ok ? r.blob() : Promise.reject()))
        .then((b) => blobs.current.set(url, URL.createObjectURL(b)))
        .catch(() => {});
    }
  }, [chapter]);

  useEffect(() => () => audio.current?.pause(), []);

  // keep the current tab visible once the strip is wider than the screen
  useEffect(() => {
    document.querySelector(".tab.on")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [ch]);

  const stop = () => {
    audio.current?.pause();
    setSpeaking(null);
  };

  const goTo = (next: number) => {
    stop();
    resumeAt.current = 0;
    setCh(next);
    setRevealed(new Set());
    window.scrollTo(0, 0);
    history.replaceState(null, "", `#${next + 1}`);
    try {
      localStorage.setItem(chapterKey, String(next));
    } catch {}
  };

  const speak = (line: number, chain: boolean) => {
    const url = chapter.audio?.[line];
    if (!url) return stop();
    const a = (audio.current ??= new Audio());
    a.src = blobs.current.get(url) ?? url;
    // a new src resets playbackRate to the default, so set both
    a.defaultPlaybackRate = a.playbackRate = RATES[rate];
    a.onended = () => {
      if (chain && line + 1 < chapter.ja.length) {
        speak(line + 1, true);
      } else {
        if (chain) resumeAt.current = 0;
        setSpeaking(null);
      }
    };
    a.play().catch(() => setSpeaking(null));
    setSpeaking({ line, chain });
    if (chain) {
      resumeAt.current = line;
      document.getElementById(`line-${line}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  };

  const listening = speaking?.chain ?? false;
  const toggleListen = () => (listening ? stop() : speak(resumeAt.current, true));

  const cycleRate = () => {
    const next = (rate + 1) % RATES.length;
    setRate(next);
    if (audio.current) audio.current.playbackRate = RATES[next];
    try {
      localStorage.setItem(rateKey, String(next));
    } catch {}
  };

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

  const toggleLine = (li: number) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (!next.delete(li)) next.add(li);
      return next;
    });

  /* Plain Japanese, no furigana and no English — the form Kanjii's reader wants
     for pulling vocabulary out of. */
  const copyChapter = async () => {
    const text = [chapter.t, ...chapter.ja.map(([ja]) => ja)].map(plain).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const hasAudio = chapter.audio?.some(Boolean) ?? false;
  const nextChapter = story.chapters[ch + 1];

  return (
    <div data-furi={FURI[furi][0]}>
      <div className="progress" style={{ width: `${progress}%` }} />

      <header className="bar">
        <div className="bar-row">
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

        <nav className="tabs" aria-label="Chapters">
          {story.chapters.map((c, i) => (
            <button
              key={i}
              className={`tab${i === ch ? " on" : ""}`}
              onClick={() => goTo(i)}
              aria-current={i === ch ? "page" : undefined}
              title={plain(c.t)}
            >
              {i + 1}
            </button>
          ))}
        </nav>
      </header>

      <main className="page">
        {ch === 0 && (
          <>
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
                {hasAudio && (
                  <li>
                    <b>Listen</b> reads the chapter aloud; ▶ beside a line plays just
                    that line.
                  </li>
                )}
                <li>Each chapter ends with its new words and grammar.</li>
                <li>
                  Don&apos;t look up everything. If you get the feeling of a sentence, keep
                  going.
                </li>
              </ul>
            </div>
          </>
        )}

        <section className="chapter">
          <div className="ch-head">
            <h2 className="ch-num jp" lang="ja">
              {ruby(chapter.n)}
            </h2>
            <h3 className="ch-title jp" lang="ja">
              {ruby(chapter.t)}
            </h3>
            <div className="ch-actions">
              {hasAudio && (
                <button className={`chip${listening ? " on" : ""}`} onClick={toggleListen}>
                  {listening ? "■ Stop" : "▶ Listen"}
                </button>
              )}
              {hasAudio && (
                <button
                  className={`chip${rate ? " on" : ""}`}
                  onClick={cycleRate}
                  aria-label="Playback speed"
                >
                  {RATES[rate]}×
                </button>
              )}
              <button className={`chip${copied ? " on" : ""}`} onClick={copyChapter}>
                {copied ? "Copied ✓" : "Copy text"}
              </button>
            </div>
          </div>

          {chapter.k && (
            <div className="newk">
              <div className="big" lang="ja">
                {chapter.k[0]}
              </div>
              <div className="txt">
                <span className="lbl">new kanji · あたらしい漢字</span>
                <b lang="ja">{chapter.k[1]}</b> &nbsp;{chapter.k[2]}
                <span className="ex" lang="ja">
                  {ruby(chapter.k[3])}
                </span>
              </div>
            </div>
          )}

          {chapter.ja.map(([ja, en], li) => (
            <div key={`${ch}:${li}`} id={`line-${li}`} className="line-row">
              <div className="line-main">
                <button
                  className={`line${ja.startsWith("「") ? " dialogue" : ""}${
                    speaking?.line === li ? " speaking" : ""
                  }`}
                  lang="ja"
                  onClick={() => toggleLine(li)}
                >
                  {ruby(ja)}
                </button>
                {(showAll || revealed.has(li)) && <p className="line-en">{en}</p>}
              </div>
              {chapter.audio?.[li] && (
                <button
                  className="say"
                  onClick={() => (speaking?.line === li ? stop() : speak(li, false))}
                  aria-label={speaking?.line === li ? "Stop" : "Play this line"}
                >
                  {speaking?.line === li ? "■" : "▶"}
                </button>
              )}
            </div>
          ))}

          <div className="box">
            <h4 className="box-label">ことば · new words</h4>
            <table className="vocab">
              <tbody>
                {chapter.v.map(([word, reading, meaning], i) => (
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
            {chapter.g.map(([pattern, meaning, example], i) => (
              <div className="grammar" key={i}>
                <b lang="ja">{ruby(pattern)}</b> — {meaning}
                <span className="ex" lang="ja">
                  {ruby(example)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {nextChapter ? (
          <button className="next" onClick={() => goTo(ch + 1)}>
            <span className="next-label">Next chapter</span>
            <span className="next-title jp" lang="ja">
              {ruby(nextChapter.n)}　{ruby(nextChapter.t)}
            </span>
            <span className="next-arrow" aria-hidden>
              →
            </span>
          </button>
        ) : (
          <div className="end" lang="ja">
            {ruby("終{お}わり")}
          </div>
        )}

        {hasAudio && story.credit && <p className="credit">Narration: {story.credit}</p>}
      </main>
    </div>
  );
}
