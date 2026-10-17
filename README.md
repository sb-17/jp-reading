# JP Reading

Graded Japanese stories with furigana and line-by-line English. Static Next.js
site, deployed to GitHub Pages at **reading.kanjii.org**, installable as a PWA.

Styling follows [Kanjii](https://kanjii.org) — same tokens, same Sawarabi Mincho
display face.

```
npm install
npm run dev     # http://localhost:3000
npm run build   # static export into out/
```

## Adding a story

Drop a JSON file into `stories/`. The filename is the URL slug
(`stories/kaze-no-machi.json` → `/stories/kaze-no-machi/`), and files are listed
in filename order — prefix them `01-`, `02-` if you want to control that.

```jsonc
{
  "title": "十一時十一分の終電",     // Japanese title
  "titleEn": "The 11:11 Last Train",
  "subtitle": "THE 11:11 LAST TRAIN · 十一話",  // under the title on the reader page
  "level": "a story for Genki I · ch.8",       // shown in the top bar and the card
  "chapters": [
    {
      "n": "第一話{{だいいちわ}}",   // chapter number
      "t": "青海町{{あおみちょう}}", // chapter title
      "k": ["嫌", "きら-い ／ いや ／ ケン", "to dislike", "嫌{きら}いじゃない"],
      "ja": [
        ["四月{しがつ}。僕{{ぼく}}は東京{とうきょう}に来{き}ました。", "April. I came to Tokyo."]
      ],
      "v": [["終電", "しゅうでん", "last train"]],
      "g": [["〜けど", "but ~ (casual が)", "うるさいけど、きらいじゃない"]]
    }
  ]
}
```

`k` (new kanji) is optional; everything else is required. Same shape as the
original single-file story, so old content pastes straight in.

### Furigana markup

Used anywhere Japanese appears — chapter titles, lines, grammar examples.

| markup | meaning |
| --- | --- |
| `漢字{よみ}` | normal — hidden in ふりがな：少なめ |
| `漢字{{よみ}}` | always shown: names, and kanji the reader isn't expected to know |

## Narration

Lines are read aloud by [VOICEVOX](https://voicevox.hiroshiba.jp/), generated
once on your machine and committed as small MP3s in `public/audio/<slug>/`.

1. Install VOICEVOX and open it (it serves its engine on `localhost:50021`).
2. `npm run tts`: lists the stories with what each needs, and asks which to
   narrate. A narrated story records every line that has no audio yet and
   deletes files for lines that changed. `npm run tts -- <slug>` skips the
   question.

Pick a voice per story with `"voice": <style id>` in its JSON, and its pace with
`"speed"` (VOICEVOX's speedScale; 0.9 by default, 1 is normal). Changing either
regenerates the whole story. The reader's speed button plays on top of that.
`npm run tts -- --list` prints the ids. The default is 玄野武宏. The reader shows
the `VOICEVOX:<name>` credit the VOICEVOX terms ask for, so check the character's
own terms before switching to a new one. If the script says ffmpeg is missing,
run `node node_modules/ffmpeg-static/install.js` once.

## Deploying

Push to `main`. `.github/workflows/deploy.yml` builds and publishes to Pages.

One-time setup: repo **Settings → Pages → Source: GitHub Actions**, then set the
custom domain to `reading.kanjii.org` (`public/CNAME` already carries it) and add
a `CNAME` DNS record for `reading` → `<username>.github.io`.

If the site ever moves to a project URL (`username.github.io/jp-reading`), set
both `basePath` and `assetPrefix` to `/jp-reading` in `next.config.ts` — without
them every asset 404s.

## Attribution

Sawarabi Mincho (`public/fonts/`) is under the SIL Open Font License; see
`public/fonts/OFL.txt`.
