import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { knownTags } from "./data/site";

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const url = z
  .url()
  .refine((value) => /^https?:\/\//.test(value), "Expected an HTTP(S) URL");
const date = z.coerce.date();
const blogCover = z.object({
  src: z
    .string()
    .regex(/^\/images\/blog\/.+/, "Expected a local path under /images/blog/"),
  alt: z.string().min(8),
  credit: z.string().min(2),
});

const blogSchema = z
  .object({
    title: z.string().min(10).max(120),
    description: z.string().min(60).max(180),
    publishedAt: date,
    updatedAt: date.optional(),
    slug,
    tags: z
      .array(z.enum(knownTags))
      .min(1)
      .max(4)
      .refine(
        (tags) => new Set(tags).size === tags.length,
        "Tags must be unique.",
      ),
    draft: z.boolean(),
    cover: blogCover.optional(),
  })
  .refine((entry) => !entry.updatedAt || entry.updatedAt >= entry.publishedAt, {
    message: "updatedAt must be equal to or later than publishedAt.",
    path: ["updatedAt"],
  })
  .refine((entry) => entry.draft || Boolean(entry.cover), {
    message: "Published posts require a cover image.",
    path: ["cover"],
  });

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: blogSchema,
});

const work = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/work" }),
  schema: z
    .object({
      title: z.string().min(4).max(120),
      summary: z.string().min(30).max(220),
      slug,
      periodStart: date,
      periodEnd: date.optional(),
      role: z.string().min(3).max(100),
      stack: z.array(z.string().min(2).max(40)).min(1).max(12),
      draft: z.boolean(),
      visibility: z.enum(["public", "description-only"]),
      demoUrl: url.optional(),
      repositoryUrl: url.optional(),
    })
    .refine(
      (entry) => !entry.periodEnd || entry.periodEnd >= entry.periodStart,
      {
        message: "periodEnd must be equal to or later than periodStart.",
        path: ["periodEnd"],
      },
    )
    .refine(
      (entry) =>
        entry.visibility !== "description-only" ||
        (!entry.demoUrl && !entry.repositoryUrl),
      {
        message: "description-only work cannot declare public URLs.",
        path: ["visibility"],
      },
    ),
});

const journey = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/journey" }),
  schema: z
    .object({
      title: z.string().min(4).max(120),
      summary: z.string().min(30).max(220),
      slug,
      periodStart: date,
      periodEnd: date.optional(),
      initiative: z.string().min(6).max(180),
      decision: z.string().min(6).max(180),
      learning: z.string().min(6).max(180),
      draft: z.boolean(),
    })
    .refine(
      (entry) => !entry.periodEnd || entry.periodEnd >= entry.periodStart,
      {
        message: "periodEnd must be equal to or later than periodStart.",
        path: ["periodEnd"],
      },
    ),
});

const profile = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/profile" }),
  schema: z.object({
    title: z.string().min(2).max(100),
    page: z.enum(["home", "cv"]),
    slug,
    order: z.number().int().nonnegative(),
    draft: z.boolean(),
  }),
});

export const collections = { blog, work, journey, profile };
