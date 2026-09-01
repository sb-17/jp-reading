import type { Metadata } from "next";
import { getStories, getStory } from "@/lib/stories";
import { Reader } from "./Reader";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getStories().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const story = getStory((await params).slug);
  return { title: `${story.title} · JP Reading` };
}

export default async function StoryPage({ params }: Props) {
  return <Reader story={getStory((await params).slug)} />;
}
