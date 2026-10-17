import { createHash } from "node:crypto";

/* What the voice is given for a line. 漢字{{よみ}} marks names and kanji the
   reader isn't expected to know — exactly the ones a TTS dictionary is likely
   to misread (青海町 isn't in it) — so those are spoken from the reading.
   Ordinary 漢字{よみ} keeps its kanji: the engine gets pitch accent from the
   word, which bare kana would throw away. Same markup as lib/ruby.tsx. */
export function speechText(ja: string): string {
  return ja.replace(
    /([一-鿿々〜]+)\{\{(.+?)\}\}|([一-鿿々〜]+)\{(.+?)\}/g,
    (_, __, reading, base) => reading ?? base,
  );
}

/** A line's audio file name: a hash of the voice, speed and spoken text, so
    editing a line (or switching voice or speed) gives it a new file and the
    cache can treat every file as immutable. */
export function audioFile(ja: string, speaker: number, speed: number): string {
  const hash = createHash("sha1")
    .update(`${speaker}\u001f${speed}\u001f${speechText(ja)}`)
    .digest("hex");
  return `${hash.slice(0, 12)}.mp3`;
}
