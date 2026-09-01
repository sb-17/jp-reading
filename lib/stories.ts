import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/* One [japanese, english] pair. The Japanese carries furigana markup — see
   lib/ruby.tsx. */
export type Line = [string, string];

export type Chapter = {
  /** chapter number, e.g. "第一話{{だいいちわ}}" */
  n: string;
  /** chapter title */
  t: string;
  /** optional new kanji: [kanji, readings, meaning, examples] */
  k?: [string, string, string, string];
  ja: Line[];
  /** new words: [word, reading, meaning] */
  v: [string, string, string][];
  /** grammar: [pattern, meaning, example] */
  g: [string, string, string][];
};

export type Story = {
  slug: string;
  title: string;
  titleEn: string;
  subtitle: string;
  level: string;
  chapters: Chapter[];
};

const dir = path.join(process.cwd(), "stories");

/** Every story in /stories, ordered by filename — prefix files with 01-, 02-
    if you care about the order they appear in on the library page. */
export function getStories(): Story[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => ({
      slug: f.replace(/\.json$/, ""),
      ...(JSON.parse(readFileSync(path.join(dir, f), "utf8")) as Omit<Story, "slug">),
    }));
}

export function getStory(slug: string): Story {
  return getStories().find((s) => s.slug === slug)!;
}
