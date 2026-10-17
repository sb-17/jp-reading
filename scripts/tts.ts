/* Narrates every story line with VOICEVOX and writes the result to
   public/audio/<slug>/, which is committed and served as static files.

     npm run tts                 list the stories and ask which to narrate
     npm run tts -- <slug> ...   narrate those stories, no questions
     npm run tts -- --list       print the available voices and their style ids

   Narrating a story records whatever lines are missing and deletes what's stale.

   Needs the VOICEVOX app open — it serves its engine on localhost:50021.
   Lines are generated once: a file's name is a hash of voice + text
   (lib/speech.ts), so a rerun only touches lines that changed. Pick a story's
   voice with "voice": <style id> in its JSON, and its pace with "speed". */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import ffmpeg from "ffmpeg-static";
import { getStories, type Story } from "../lib/stories";
import { audioFile, speechText } from "../lib/speech";

const ENGINE = "http://127.0.0.1:50021";
/** 玄野武宏 (ノーマル) — a calm young male voice, which suits a first-person 僕 narrator. */
const DEFAULT_VOICE = 11;
/** VOICEVOX's normal pace is quick for a learner. Slowing it here lengthens
    the vowels and pauses at synthesis, which sounds more natural than playing
    the file back slower. */
const DEFAULT_SPEED = 0.9;

type Speaker = { name: string; styles: { name: string; id: number }[] };

async function engine(route: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${ENGINE}${route}`, init).catch(() => {
    throw new Error(`No VOICEVOX engine at ${ENGINE} — is the VOICEVOX app open?`);
  });
  if (!res.ok) throw new Error(`${route}: ${res.status} ${await res.text()}`);
  return res;
}

/** VOICEVOX returns 24 kHz 16-bit WAV, ~48 KB a second — a story would be tens
    of megabytes. Mono 48 kbps MP3 is an eighth of that, and plays everywhere,
    Safari included. */
async function narrate(text: string, speaker: number, speed: number): Promise<Buffer> {
  const q = encodeURIComponent(text);
  const query = await (await engine(`/audio_query?text=${q}&speaker=${speaker}`, { method: "POST" })).json();
  query.speedScale = speed;
  const wav = Buffer.from(await (await engine(`/synthesis?speaker=${speaker}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  })).arrayBuffer());
  return execFileSync(ffmpeg!, ["-v", "error", "-i", "pipe:0", "-ac", "1", "-b:a", "48k", "-f", "mp3", "pipe:1"], {
    input: wav,
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** What narrating a story would do: the files its lines need, and how many
    of them are missing or no longer needed. */
function plan(story: Story) {
  const voice = story.voice ?? DEFAULT_VOICE;
  const speed = story.speed ?? DEFAULT_SPEED;
  const dir = path.join("public", "audio", story.slug);
  const lines = story.chapters.flatMap((c) => c.ja.map(([ja]) => ja));
  const wanted = new Set(lines.map((ja) => audioFile(ja, voice, speed)));
  const have = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".mp3")) : [];
  const missing = [...wanted].filter((f) => !have.includes(f)).length;
  const stale = have.filter((f) => !wanted.has(f)).length;
  return { voice, speed, dir, lines, wanted, missing, stale };
}

/** Numbered list with each story's state, then "which?" — numbers, or "all"
    for every story that needs work. */
async function choose(stories: Story[]): Promise<Story[]> {
  stories.forEach((story, i) => {
    const { missing, stale, voice, speed } = plan(story);
    const state = missing || stale ? `${missing} to record, ${stale} to delete` : "up to date";
    console.log(`${String(i + 1).padStart(3)}  ${story.slug}  (voice ${voice}, speed ${speed}) — ${state}`);
  });

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question("\nNarrate which? (numbers like 1 3, or all; Enter to cancel) ")).trim();
  rl.close();

  if (answer === "all") return stories.filter((s) => plan(s).missing || plan(s).stale);
  return answer
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((n) => {
      const story = stories[Number(n) - 1];
      if (!story) throw new Error(`No story ${n}`);
      return story;
    });
}

async function main() {
  if (process.argv.includes("--list")) {
    const speakers: Speaker[] = await (await engine("/speakers")).json();
    for (const s of speakers) console.log(`${s.name}: ${s.styles.map((t) => `${t.name} ${t.id}`).join(", ")}`);
    return;
  }

  const stories = getStories();
  const slugs = process.argv.slice(2);
  const picked = slugs.length
    ? slugs.map((slug) => {
        const story = stories.find((s) => s.slug === slug);
        if (!story) throw new Error(`No story "${slug}" — the slug is the file name without .json`);
        return story;
      })
    : await choose(stories);
  if (!picked.length) return;

  const speakers: Speaker[] = await (await engine("/speakers")).json();

  for (const story of picked) {
    const { voice, speed, dir, lines, wanted } = plan(story);
    const speaker = speakers.find((s) => s.styles.some((t) => t.id === voice));
    if (!speaker) throw new Error(`${story.slug}: no VOICEVOX style ${voice} (see --list)`);

    mkdirSync(dir, { recursive: true });
    let made = 0;

    for (const ja of lines) {
      const file = path.join(dir, audioFile(ja, voice, speed));
      if (existsSync(file)) continue;
      writeFileSync(file, await narrate(speechText(ja), voice, speed));
      process.stdout.write(`\r${story.slug}: ${++made} new`);
    }

    // lines that were edited or removed, or narrated under a previous voice or speed
    let removed = 0;
    for (const f of readdirSync(dir)) {
      if (f.endsWith(".mp3") && !wanted.has(f)) {
        rmSync(path.join(dir, f));
        removed++;
      }
    }

    writeFileSync(
      path.join(dir, "voice.json"),
      JSON.stringify({ speaker: voice, speed, credit: `VOICEVOX:${speaker.name}` }, null, 1) + "\n",
    );
    console.log(`\r${story.slug}: ${made} new, ${removed} removed, ${wanted.size} lines — VOICEVOX:${speaker.name}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
