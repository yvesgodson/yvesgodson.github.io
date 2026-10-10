export const site = {
  name: "AKOTO Yves",
  email: "akotchaye07@gmail.com",
  github: "https://github.com/yvesgodson",
  linkedin: "https://linkedin.com/in/yves-akoto",
  defaultDescription:
    "Portfolio and technical notes by Yves Akoto, a computer science student focused on artificial intelligence.",
} as const;

export const ui = {
  nav: [
    ["Home", "/"],
    ["Blog", "/blog/"],
    ["CV", "/cv/"],
  ],
  menu: "Menu",
  closeMenu: "Close menu",
  light: "Switch to light theme",
  dark: "Switch to dark theme",
  searchLabel: "Search the blog",
  searchPlaceholder: "Search articles",
  searchLoading: "Loading search…",
  searchUnavailable:
    "Search is available in the published version of this site.",
  searchEmpty: "No articles match this search.",
  clear: "Clear",
} as const;

export const knownTags = [
  "ia",
  "software-engineering",
  "data",
  "recherche",
  "notes-de-lecture",
  "projets-personnels",
  "tutoriels",
] as const;

export const tagLabels: Record<(typeof knownTags)[number], string> = {
  ia: "AI",
  "software-engineering": "software engineering",
  data: "data",
  recherche: "research",
  "notes-de-lecture": "reading notes",
  "projets-personnels": "personal projects",
  tutoriels: "tutorials",
};
