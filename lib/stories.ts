import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { audioFile } from "./speech";

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
  /** added by getStory, not written in the JSON: each line's narration URL,
      or null where none has been generated */
  audio?: (string | null)[];
};

export type Story = {
  slug: string;
  title: string;
  titleEn: string;
  subtitle: string;
  level: string;
  /** VOICEVOX style id for `npm run tts`; the script's default if left out */
  voice?: number;
  /** narration speed for `npm run tts` (VOICEVOX speedScale, 1 = normal) */
  speed?: number;
  /** added by getStory: the voice credit VOICEVOX's terms require */
  credit?: string;
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

/** One story, with the narration that exists for it. The voice comes from
    the voice.json `npm run tts` writes, not from the story — the files were
    named under that voice, whatever the story asks for now. */
export function getStory(slug: string): Story {
  const story = getStories().find((s) => s.slug === slug)!;
  const audioDir = path.join(process.cwd(), "public", "audio", slug);
  const voicePath = path.join(audioDir, "voice.json");
  if (!existsSync(voicePath)) return story;

  const { speaker, speed, credit } = JSON.parse(readFileSync(voicePath, "utf8"));
  return {
    ...story,
    credit,
    chapters: story.chapters.map((c) => ({
      ...c,
      audio: c.ja.map(([ja]) => {
        const f = audioFile(ja, speaker, speed);
        return existsSync(path.join(audioDir, f)) ? `/audio/${slug}/${f}` : null;
      }),
    })),
  };
}
