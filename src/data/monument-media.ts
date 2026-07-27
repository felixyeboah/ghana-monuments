import media from "./monument-media.json";

export type MonumentPhoto = {
  title: string;
  src: string;
  width: number;
  height: number;
  /** Photographer, as credited on Wikimedia Commons. Always shown. */
  credit: string;
  licence: string;
  sourceUrl: string;
};

export type MonumentMedia = {
  title: string;
  /** Lead paragraphs of the Wikipedia article. */
  extract: string;
  wikipediaUrl: string | null;
  coordinates: { lat: number; lon: number } | null;
  photos: MonumentPhoto[];
};

const MEDIA = media as Record<string, MonumentMedia>;

export function mediaFor(slug: string): MonumentMedia | null {
  return MEDIA[slug] ?? null;
}
