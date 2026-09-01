import { Fragment, type ReactNode } from "react";

/* Furigana markup, carried over from the original single-file story:
     漢字{よみ}    normal — hidden in ふりがな：少なめ
     漢字{{よみ}}  always shown (names, kanji you're still learning)
   The kanji class is U+4E00–U+9FFF plus 々 and 〜. */
const MARKUP = /([一-鿿々〜]+)\{\{(.+?)\}\}|([一-鿿々〜]+)\{(.+?)\}/g;

/** Turns furigana markup into <ruby> elements. */
export function ruby(text: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;

  for (const m of text.matchAll(MARKUP)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const always = m[1] !== undefined;
    out.push(
      <ruby key={m.index} className={always ? "always" : ""}>
        {always ? m[1] : m[3]}
        <rt>{always ? m[2] : m[4]}</rt>
      </ruby>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));

  return out.map((n, i) => <Fragment key={i}>{n}</Fragment>);
}

/** The same text with the markup stripped — for <title>, aria labels, etc. */
export function plain(text: string): string {
  return text.replace(MARKUP, (_, a, __, b) => a ?? b);
}
