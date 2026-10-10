import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getPublicEntries } from "../lib/content";
import { withBase } from "../lib/routes";

export const GET: APIRoute = async (context) => {
  const entries = await getPublicEntries("blog");
  return rss({
    title: "AKOTO Yves · Blog",
    description: "Technical notes by Yves Akoto.",
    site: context.site ?? "https://yvesgodson.github.io",
    items: entries.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: withBase(`/blog/${entry.data.slug}/`),
    })),
  });
};
