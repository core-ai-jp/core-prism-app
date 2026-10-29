import content from "./content.json";
export type Section = {
  title: string;
  body: string;
  steps?: string[];
  technical?: string;
};
export type Article = {
  slug: string;
  category: string;
  title: string;
  summary: string;
  minutes: number;
  sections: Section[];
  sources: { title: string; url: string }[];
};
export const articles: Article[] = content.articles;
export const resources = content.resources;
export const checked = content.checked;
export const booking = content.booking;
