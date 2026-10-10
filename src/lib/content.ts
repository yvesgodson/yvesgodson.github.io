import { getCollection, type CollectionEntry } from "astro:content";

type AnyEntry =
  | CollectionEntry<"blog">
  | CollectionEntry<"work">
  | CollectionEntry<"journey">;

export function isPublic(entry: AnyEntry) {
  const publishedAt =
    "publishedAt" in entry.data ? entry.data.publishedAt : undefined;
  return (
    !entry.data.draft && (!publishedAt || publishedAt.getTime() <= Date.now())
  );
}

export async function getPublicEntries<T extends "blog" | "work" | "journey">(
  collection: T,
) {
  const entries = await getCollection(collection, (entry) =>
    isPublic(entry as AnyEntry),
  );
  return entries.sort((a, b) => {
    const aDate =
      "publishedAt" in a.data ? a.data.publishedAt : a.data.periodStart;
    const bDate =
      "publishedAt" in b.data ? b.data.publishedAt : b.data.periodStart;
    return (
      bDate.getTime() - aDate.getTime() ||
      a.data.slug.localeCompare(b.data.slug)
    );
  });
}

export function readingMinutes(body: string) {
  const usefulText = body
    .replace(/^---[\s\S]*?---/, "")
    .replace(/^import\s.+$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[#[\]*_>]/g, " ")
    .trim();
  const words = usefulText ? usefulText.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

export async function getProfileSections(page: "home" | "cv") {
  const entries = await getCollection(
    "profile",
    (entry) => !entry.data.draft && entry.data.page === page,
  );
  return entries.sort(
    (a, b) =>
      a.data.order - b.data.order || a.data.slug.localeCompare(b.data.slug),
  );
}

export function formatDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" },
) {
  return new Intl.DateTimeFormat("en-GB", options).format(date);
}

export function formatPeriod(start: Date, end: Date | undefined) {
  const format = new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  });
  return end
    ? `${format.format(start)} – ${format.format(end)}`
    : `${format.format(start)} – present`;
}
