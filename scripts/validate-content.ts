import { access, readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { parseDocument } from "yaml";
import { knownTags } from "../src/data/site";

const root = resolve("src/content");
const collections = ["blog", "work", "journey", "profile"] as const;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const knownTagSet = new Set<string>(knownTags);
const errors: string[] = [];
const slugKeys = new Set<string>();
let fileCount = 0;

async function filesIn(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) return filesIn(fullPath);
      return [fullPath];
    }),
  );
  return files.flat();
}

function message(file: string, detail: string) {
  errors.push(`${relative(process.cwd(), file)}: ${detail}`);
}

function dateOf(value: unknown) {
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function requireText(
  data: Record<string, unknown>,
  key: string,
  file: string,
  minimum = 1,
  maximum = Infinity,
) {
  const value = data[key];
  if (
    typeof value !== "string" ||
    value.trim().length < minimum ||
    value.trim().length > maximum
  ) {
    message(
      file,
      `frontmatter.${key} must be a string between ${minimum} and ${maximum} characters.`,
    );
  }
}

function validateCommon(
  data: Record<string, unknown>,
  file: string,
  collection: string,
) {
  if (typeof data.slug !== "string" || !slugPattern.test(data.slug))
    message(file, "frontmatter.slug must be lowercase ASCII kebab-case.");
  if (typeof data.slug === "string") {
    const slugKey = `${collection}:${data.slug}`;
    if (slugKeys.has(slugKey))
      message(file, `Duplicate slug for ${collection}: ${data.slug}`);
    slugKeys.add(slugKey);
  }
  if (typeof data.draft !== "boolean")
    message(file, "frontmatter.draft is required and must be boolean.");
}

async function validateBlog(
  data: Record<string, unknown>,
  body: string,
  file: string,
) {
  requireText(data, "title", file, 10, 120);
  requireText(data, "description", file, 60, 180);
  const published = dateOf(data.publishedAt);
  if (!published)
    message(file, "frontmatter.publishedAt must be a valid ISO date.");
  if (published && data.draft !== true && published.getTime() > Date.now())
    message(file, "Published articles cannot have a future publishedAt date.");
  if (
    data.updatedAt &&
    (!dateOf(data.updatedAt) ||
      (published && dateOf(data.updatedAt)!.getTime() < published.getTime()))
  )
    message(
      file,
      "frontmatter.updatedAt must be a valid date equal to or later than publishedAt.",
    );
  if (
    !Array.isArray(data.tags) ||
    !data.tags.length ||
    data.tags.some((tag) => typeof tag !== "string" || !knownTagSet.has(tag))
  )
    message(file, "frontmatter.tags must contain known tags.");
  if (Array.isArray(data.tags) && new Set(data.tags).size !== data.tags.length)
    message(file, "frontmatter.tags cannot contain duplicates.");
  if (data.draft === false && !data.cover)
    message(file, "Published posts require a cover image.");
  if (data.cover) {
    const cover = data.cover as Record<string, unknown>;
    if (typeof cover.src !== "string" || !/^\/images\/blog\//.test(cover.src))
      message(
        file,
        "frontmatter.cover.src must be a local path under /images/blog/.",
      );
    if (typeof cover.src === "string" && /^\/images\/blog\//.test(cover.src)) {
      try {
        await access(join(resolve("public"), cover.src.replace(/^\//, "")));
      } catch {
        message(file, `frontmatter.cover.src does not exist: ${cover.src}`);
      }
    }
    if (typeof cover.alt !== "string" || cover.alt.trim().length < 8)
      message(file, "frontmatter.cover.alt must be descriptive.");
    if (typeof cover.credit !== "string" || cover.credit.trim().length < 2)
      message(file, "frontmatter.cover.credit is required.");
  }
  if (/^#\s+/m.test(body))
    message(
      file,
      "Article bodies must not contain an H1. The page template renders it.",
    );
}

function validateWork(
  data: Record<string, unknown>,
  body: string,
  file: string,
) {
  requireText(data, "title", file, 4, 120);
  requireText(data, "summary", file, 30, 220);
  requireText(data, "role", file, 3, 100);
  if (!dateOf(data.periodStart))
    message(file, "frontmatter.periodStart must be a valid ISO date.");
  if (data.periodEnd && !dateOf(data.periodEnd))
    message(file, "frontmatter.periodEnd must be a valid ISO date.");
  if (
    dateOf(data.periodStart) &&
    dateOf(data.periodEnd) &&
    dateOf(data.periodEnd)!.getTime() < dateOf(data.periodStart)!.getTime()
  )
    message(file, "periodEnd cannot precede periodStart.");
  if (!Array.isArray(data.stack) || !data.stack.length)
    message(file, "frontmatter.stack must contain at least one technology.");
  if (data.visibility !== "public" && data.visibility !== "description-only")
    message(
      file,
      "frontmatter.visibility must be 'public' or 'description-only'.",
    );
  if (
    data.visibility === "description-only" &&
    (data.demoUrl || data.repositoryUrl)
  )
    message(file, "description-only work cannot declare public URLs.");
  if (data.draft === false && !/^##\s+Contribution\b/im.test(body))
    message(
      file,
      "Published work must include a Contribution section in its body.",
    );
  for (const key of ["demoUrl", "repositoryUrl"]) {
    if (
      data[key] &&
      (typeof data[key] !== "string" || !/^https?:\/\//.test(data[key]))
    )
      message(file, `frontmatter.${key} must be an HTTP(S) URL.`);
  }
}

function validateJourney(data: Record<string, unknown>, file: string) {
  requireText(data, "title", file, 4, 120);
  requireText(data, "summary", file, 30, 220);
  for (const field of ["initiative", "decision", "learning"])
    requireText(data, field, file, 6, 180);
  if (!dateOf(data.periodStart))
    message(file, "frontmatter.periodStart must be a valid ISO date.");
  if (data.periodEnd && !dateOf(data.periodEnd))
    message(file, "frontmatter.periodEnd must be a valid ISO date.");
}

function validateProfile(
  data: Record<string, unknown>,
  body: string,
  file: string,
) {
  requireText(data, "title", file, 2, 100);
  if (data.page !== "home" && data.page !== "cv")
    message(file, "frontmatter.page must be 'home' or 'cv'.");
  const pathPage = relative(join(root, "profile"), file)
    .replaceAll("\\", "/")
    .split("/")[0];
  if (pathPage !== data.page)
    message(file, "frontmatter.page must match its page directory.");
  if (
    typeof data.order !== "number" ||
    !Number.isInteger(data.order) ||
    data.order < 0
  )
    message(file, "frontmatter.order must be a nonnegative integer.");
  if (!body.trim()) message(file, "Profile section body cannot be empty.");
}

for (const collection of collections) {
  const collectionDirectory = join(root, collection);
  for (const file of await filesIn(collectionDirectory)) {
    if (![".md", ".mdx"].includes(extname(file))) continue;
    fileCount += 1;
    const source = await readFile(file, "utf8");
    const match = source.match(
      /^---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?([\s\S]*)$/,
    );
    if (!match) {
      message(file, "Missing YAML frontmatter block.");
      continue;
    }
    const document = parseDocument(match[1]);
    if (document.errors.length) {
      document.errors.forEach((error) =>
        message(file, `Invalid YAML: ${error.message}`),
      );
      continue;
    }
    const data = document.toJSON();
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      message(file, "Frontmatter must be an object.");
      continue;
    }
    validateCommon(data as Record<string, unknown>, file, collection);
    if (collection === "blog")
      await validateBlog(data as Record<string, unknown>, match[2], file);
    if (collection === "work")
      validateWork(data as Record<string, unknown>, match[2], file);
    if (collection === "journey")
      validateJourney(data as Record<string, unknown>, file);
    if (collection === "profile")
      validateProfile(data as Record<string, unknown>, match[2], file);
  }
}

if (errors.length) {
  console.error(
    `Content validation failed with ${errors.length} issue(s):\n\n${errors.map((error) => `- ${error}`).join("\n")}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    fileCount
      ? `Validated ${fileCount} content file(s).`
      : "No content files to validate yet. Empty states will be rendered.",
  );
}
