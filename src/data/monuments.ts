import type { MonumentSlug } from "@/lib/monument-art";

export type Monument = {
  slug: MonumentSlug;
  name: string;
  /** Shown in the floating label pill while the monument holds focus. */
  place: string;
  region: string;
  /** Sort key and the large numeral drawn behind the silhouette. */
  year: number;
  /** How the year should read when it is approximate or spans a period. */
  yearLabel: string;
  /** One line, present tense — the hook shown under the name on focus. */
  tagline: string;
  description: string;
  facts: { label: string; value: string }[];
  /**
   * Height of the silhouette in skyline units, relative to the tallest
   * monument. Keeps a 245 m bridge from towering over a 28 m lighthouse
   * once the wildly different source aspect ratios are normalised.
   */
  scale: number;
};

export const MONUMENTS: Monument[] = [
  {
    slug: "larabanga-mosque",
    name: "Larabanga Mosque",
    place: "Larabanga",
    region: "Savannah Region",
    year: 1421,
    yearLabel: "c. 1421",
    tagline: "Mud, stick and six centuries of continuous prayer.",
    description:
      "The oldest mosque in Ghana and one of the oldest in West Africa, built from sun-dried mud and timber in the Sudano-Sahelian style. Its whitewashed buttresses and protruding horizontal beams are re-plastered by the community after each rainy season — the building survives because it is continuously remade. Locals call it the Mecca of West Africa.",
    facts: [
      { label: "Built", value: "c. 1421" },
      { label: "Style", value: "Sudano-Sahelian" },
      { label: "Material", value: "Mud and timber" },
      { label: "Region", value: "Savannah" },
    ],
    scale: 0.5,
  },
  {
    slug: "elmina-castle",
    name: "Elmina Castle",
    place: "Elmina",
    region: "Central Region",
    year: 1482,
    yearLabel: "1482",
    tagline: "The oldest European building south of the Sahara.",
    description:
      "Raised by the Portuguese as São Jorge da Mina, Elmina began as a trading post for gold and became a holding station for enslaved people. It passed to the Dutch in 1637 and the British in 1872. The whitewashed walls above and the airless dungeons below tell two versions of the same four centuries.",
    facts: [
      { label: "Built", value: "1482" },
      { label: "Founded by", value: "Portugal" },
      { label: "Status", value: "UNESCO World Heritage" },
      { label: "Region", value: "Central" },
    ],
    scale: 0.66,
  },
  {
    slug: "cape-coast-castle",
    name: "Cape Coast Castle",
    place: "Cape Coast",
    region: "Central Region",
    year: 1555,
    yearLabel: "1555",
    tagline: "Where the Door of No Return opens onto the Atlantic.",
    description:
      "Begun as a Portuguese lodge, rebuilt in stone by the Swedes in 1653, and held longest by the British, who made it the seat of the Gold Coast administration. Tens of thousands passed through its Door of No Return. The castle now houses a museum, and the door has been symbolically renamed the Door of Return for those coming back.",
    facts: [
      { label: "Built", value: "1555" },
      { label: "Held by", value: "Portugal, Sweden, Britain" },
      { label: "Status", value: "UNESCO World Heritage" },
      { label: "Region", value: "Central" },
    ],
    scale: 0.58,
  },
  {
    slug: "jamestown-lighthouse",
    name: "Jamestown Lighthouse",
    place: "Jamestown, Accra",
    region: "Greater Accra",
    year: 1871,
    yearLabel: "1871 · rebuilt 1930",
    tagline: "Twenty-eight metres above the loudest harbour in Accra.",
    description:
      "First lit in 1871 and rebuilt in its current form in 1930, the lighthouse looks out over Jamestown's fishing harbour and the colonial quarter that grew around Fort James. Its beam reaches sixteen nautical miles. Climb it and the whole of old Accra — boxing gyms, canoes, corrugated roofs — lays itself out below.",
    facts: [
      { label: "First lit", value: "1871" },
      { label: "Rebuilt", value: "1930" },
      { label: "Height", value: "28 metres" },
      { label: "Range", value: "16 nautical miles" },
    ],
    scale: 0.88,
  },
  {
    slug: "manhyia-palace",
    name: "Manhyia Palace",
    place: "Kumasi",
    region: "Ashanti Region",
    year: 1925,
    yearLabel: "1925",
    tagline: "Built for a king returning from exile.",
    description:
      "The British built Manhyia in 1925 for Asantehene Prempeh I on his return from twenty-eight years of exile in the Seychelles — then billed him for it. It has been the seat of the Asante monarchy ever since. The original building is now a museum; the Asantehene still holds court on the grounds.",
    facts: [
      { label: "Built", value: "1925" },
      { label: "Seat of", value: "The Asantehene" },
      { label: "Now", value: "Palace and museum" },
      { label: "Region", value: "Ashanti" },
    ],
    scale: 0.52,
  },
  {
    slug: "adomi-bridge",
    name: "Adomi Bridge",
    place: "Atimpoku",
    region: "Eastern Region",
    year: 1957,
    yearLabel: "1957",
    tagline: "A single steel arch thrown across the Volta.",
    description:
      "Opened in the year of independence, Adomi spans 245 metres of the Volta River in one suspended arch — the longest single span in West Africa when it was built. It carries the road north toward the Volta Region and appears on the Ghanaian twenty-cedi note.",
    facts: [
      { label: "Opened", value: "1957" },
      { label: "Span", value: "245 metres" },
      { label: "Type", value: "Suspended arch" },
      { label: "Crosses", value: "River Volta" },
    ],
    scale: 0.6,
  },
  {
    slug: "black-star-gate",
    name: "Black Star Gate",
    place: "Accra",
    region: "Greater Accra",
    year: 1961,
    yearLabel: "1961",
    tagline: "Freedom and Justice, AD 1957.",
    description:
      "The black star at its summit is the emblem Nkrumah took from Marcus Garvey's Black Star Line and set at the centre of the national flag. The arch reads FREEDOM AND JUSTICE · AD 1957, and the eternal flame of African liberation burns beside it. Every Independence Day parade passes underneath.",
    facts: [
      { label: "Built", value: "1961" },
      { label: "Inscribed", value: "Freedom and Justice" },
      { label: "Emblem", value: "The Black Star" },
      { label: "Region", value: "Greater Accra" },
    ],
    scale: 0.62,
  },
  {
    slug: "independence-square",
    name: "Independence Square",
    place: "Accra",
    region: "Greater Accra",
    year: 1961,
    yearLabel: "1961",
    tagline: "Thirty thousand people, facing the sea.",
    description:
      "Also called Black Star Square, it was commissioned by Nkrumah for Queen Elizabeth II's 1961 visit and is among the largest city squares in the world. The tiered stands hold thirty thousand and open directly onto the Gulf of Guinea. It is where Ghana holds its Independence Day parade every sixth of March.",
    facts: [
      { label: "Built", value: "1961" },
      { label: "Capacity", value: "30,000" },
      { label: "Also called", value: "Black Star Square" },
      { label: "Faces", value: "Gulf of Guinea" },
    ],
    scale: 0.4,
  },
  {
    slug: "kwame-nkrumah-mausoleum",
    name: "Kwame Nkrumah Mausoleum",
    place: "Accra",
    region: "Greater Accra",
    year: 1992,
    yearLabel: "1992",
    tagline: "A sword returned to the earth, point downward.",
    description:
      "Designed by Don Arthur, the mausoleum stands on the ground where Nkrumah declared independence in 1957. Its form is an upturned sword driven into the earth — an Akan symbol of peace — clad in Italian marble and ringed by fountains held aloft by sculpted flute players. Nkrumah and his wife Fathia are buried beneath.",
    facts: [
      { label: "Opened", value: "1992" },
      { label: "Architect", value: "Don Arthur" },
      { label: "Form", value: "Inverted sword" },
      { label: "Marks", value: "Independence declaration" },
    ],
    scale: 0.72,
  },
  {
    slug: "national-theatre-ghana",
    name: "National Theatre",
    place: "Accra",
    region: "Greater Accra",
    year: 1992,
    yearLabel: "1992",
    tagline: "A ship under full sail, moored in the middle of Accra.",
    description:
      "Designed by Chinese architect Cheng Taining and gifted to Ghana in 1992, the National Theatre is an expressionist white sweep of curved roofs that reads as sails, or a bird mid-take-off, depending on where you stand. It seats 1,500 and is home to the National Dance Company, National Symphony Orchestra and National Theatre Players.",
    facts: [
      { label: "Opened", value: "1992" },
      { label: "Architect", value: "Cheng Taining" },
      { label: "Seats", value: "1,500" },
      { label: "Home to", value: "Three national companies" },
    ],
    scale: 0.68,
  },
  {
    slug: "national-mosque-of-ghana",
    name: "National Mosque of Ghana",
    place: "Kanda, Accra",
    region: "Greater Accra",
    year: 2021,
    yearLabel: "2021",
    tagline: "Four minarets, sixty metres up, newest on the skyline.",
    description:
      "Completed in 2021 in Kanda, the National Mosque is the largest in Ghana and the newest landmark on Accra's skyline. Built in Ottoman style with Turkish funding, its central dome and four minarets hold up to 15,000 worshippers, and the complex includes a school, clinic and the residence of the National Chief Imam.",
    facts: [
      { label: "Completed", value: "2021" },
      { label: "Style", value: "Ottoman" },
      { label: "Capacity", value: "15,000" },
      { label: "Minarets", value: "Four" },
    ],
    scale: 1,
  },
];

export const MONUMENT_BY_SLUG = new Map(MONUMENTS.map((m) => [m.slug, m]));

/** Matches on name, place and region so "Accra" or "castle" both narrow the skyline. */
export function matchesQuery(monument: Monument, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [monument.name, monument.place, monument.region, monument.yearLabel]
    .join(" ")
    .toLowerCase()
    .includes(q);
}
