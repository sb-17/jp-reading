import Link from "next/link";
import { getStories } from "@/lib/stories";
import { ThemeToggle } from "./ThemeToggle";

export default function Library() {
  const stories = getStories();

  return (
    <>
      <div className="bar">
        <div className="bar-title">
          日本語を読む
          <small>JP Reading</small>
        </div>
        <ThemeToggle />
      </div>

      <main className="page">
        <h1 className="page-title">Stories</h1>
        <p className="page-lede">
          Tap a line to see its English. Furigana can be turned down or off as you get
          more comfortable.
        </p>

        <div className="story-list">
          {stories.map((s) => (
            <Link key={s.slug} className="story-card" href={`/stories/${s.slug}/`}>
              <h2 className="jp" lang="ja">
                {s.title}
              </h2>
              <p className="en">{s.titleEn}</p>
              <p className="meta">
                {s.chapters.length} chapters · {s.level}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
