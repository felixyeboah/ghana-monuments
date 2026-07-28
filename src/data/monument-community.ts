/**
 * The people who live with each monument.
 *
 * Kept separate from `monuments.ts`, which describes the buildings. This file
 * is about the towns around them — who lives there, what language is spoken in
 * the street, what the year is organised around, and how people earn.
 *
 * Written editorially rather than scraped: the encyclopaedia text already in
 * each record covers the structure, and this is the part that gives it a
 * present tense. Every record links to Wikipedia for anyone who wants to check
 * or read further.
 */

export type Community = {
  /** The people whose land the monument stands on. */
  people: string;
  /** What is actually spoken locally, not the official national language. */
  language: string;
  /** How the town earns. */
  livelihood: string;
  /** The festival the local year turns on, where there is a clear one. */
  festival: { name: string; when: string; note: string } | null;
  /** The place as it is today. */
  life: string;
  /** What is practised, made, danced or celebrated there. */
  culture: string;
};

export const COMMUNITIES: Record<string, Community> = {
  "larabanga-mosque": {
    people: "Gonja, with long-settled Kamara families",
    language: "Gonja (Ngbanyito), with Hausa as a trade language",
    livelihood: "Farming and shea",
    festival: {
      name: "Damba",
      when: "Third month of the Islamic calendar",
      note: "Marks the Prophet's birth across northern Ghana, with drumming, smocks and horsemanship.",
    },
    life: "Larabanga is a small farming village on the road to Mole National Park, set in savannah scattered with shea trees. Almost everyone here is Muslim, and the mosque is kept by hereditary custodians who have maintained it across generations. Yam, millet, maize and groundnut are grown through the single rainy season, and women gather and press shea nuts into butter — one of the few reliable sources of cash.",
    culture: "The building is itself the tradition. After each rainy season the community re-plasters the mud walls, which is the only reason a fifteenth-century structure is still standing: it survives because it is continuously remade, by hand, by the people who pray in it. Beside the village sits the Mystic Stone, which local history holds returned each time road builders tried to move it.",
  },

  "elmina-castle": {
    people: "Fante",
    language: "Fante, a dialect of Akan",
    livelihood: "Fishing, canoe building and fish smoking",
    festival: {
      name: "Bakatue",
      when: "First Tuesday of July",
      note: "Opens the Benya lagoon to fishing for the season, with a procession, a net cast by the chief and a regatta.",
    },
    life: "Elmina — Edina to the people who live there — is a working fishing town wrapped around a lagoon and a harbour crowded with painted canoes. The Benya separates the castle from the town. The catch landed each morning is smoked by women in ovens behind the shore and sent inland to market, and the boats are still built along the water by hand.",
    culture: "Elmina's asafo companies, the traditional militia organisations of Fante towns, maintain concrete shrines called posuban — among the most extravagant in Ghana, stacked with painted figures and company colours, standing in the middle of ordinary streets. They are the reason Elmina rewards walking well beyond the castle walls.",
  },

  "cape-coast-castle": {
    people: "Fante",
    language: "Fante",
    livelihood: "Fishing, schooling and tourism",
    festival: {
      name: "Fetu Afahye",
      when: "First Saturday of September",
      note: "Asafo companies, palanquins and the Oguaamanhen in procession — begun as a cleansing after a plague.",
    },
    life: "Cape Coast — Oguaa — is a town of fishing boats and schoolchildren. It was the seat of colonial administration until 1877 and kept the schools that came with that: Mfantsipim, Adisadel and Wesley Girls' are among the oldest in the country, and the University of Cape Coast sits on the ridge above the town. Term time fills the streets with uniforms.",
    culture: "Every two years Cape Coast hosts PANAFEST and Emancipation Day, when people of African descent return to the castles — the reason the Door of No Return has been symbolically renamed the Door of Return. For a town carrying that history, it is strikingly unsolemn day to day: the fish market is loud, and the asafo companies still turn out in colour.",
  },

  "jamestown-lighthouse": {
    people: "Ga",
    language: "Ga",
    livelihood: "Fishing and boxing",
    festival: {
      name: "Homowo",
      when: "August into September",
      note: "The Ga harvest festival — the name means hooting at hunger — marked with kpokpoi and processions.",
    },
    life: "Jamestown, or Ngleshie Alata, is one of Accra's oldest quarters: a dense grid of colonial houses, fishing compounds and gyms running down to the sea. The harbour below the lighthouse is where Accra's canoe fleet lands, and the smell of smoked fish carries through the streets. It is poor, crowded and among the most photographed parts of the city.",
    culture: "Jamestown produces boxers the way other places produce footballers — Azumah Nelson, Ike Quartey and a line of champions came out of the Bukom gyms, and you can still hear training through open doors. Each August the Chale Wote Street Art Festival takes over the same streets, painting the walls of the old town for a week.",
  },

  "manhyia-palace": {
    people: "Asante",
    language: "Asante Twi",
    livelihood: "Trade, cocoa and craft",
    festival: {
      name: "Akwasidae",
      when: "Every sixth Sunday",
      note: "The Asantehene sits in state under umbrellas, with drums, horns and the linguists' staffs.",
    },
    life: "Kumasi is Ghana's second city and the heart of Asante. Kejetia, at its centre, is among the largest markets in West Africa. The Asantehene remains a living authority rather than a ceremonial one — matters of chieftaincy, land and custom still pass through Manhyia, and the palace is a working seat as much as a museum.",
    culture: "The crafts are held village by village around the city: kente woven at Bonwire, adinkra stamped at Ntonso, brass cast at Krofrom. Each cloth and symbol carries meaning that is read rather than merely worn, and the Adae cycle — a forty-two-day calendar — still sets the rhythm of the court.",
  },

  "adomi-bridge": {
    people: "Ewe and Akan communities of the Volta gorge",
    language: "Ewe and Twi",
    livelihood: "River fishing, farming and the road trade",
    festival: null,
    life: "Atimpoku sits where the road north meets the Volta. Below the bridge the river runs wide and slow, worked from narrow canoes; above it the Akosombo Dam holds back Lake Volta, the largest reservoir on earth by surface area, which flooded hundreds of villages when it filled in the 1960s and resettled tens of thousands of people.",
    culture: "Every driver crossing knows Atimpoku for abolo — a soft steamed corn bread sold at the roadside by women who reach up to car windows, wrapped with fried shrimp and the tiny fish called one-man-thousand. It is one of the few places in Ghana where a bridge, a meal and a stretch of road are the same landmark.",
  },

  "black-star-gate": {
    people: "Ga",
    language: "Ga",
    livelihood: "Civic and ceremonial",
    festival: {
      name: "Independence Day",
      when: "6 March",
      note: "The parade passes beneath the arch; the eternal flame of African liberation burns alongside.",
    },
    life: "The arch stands on Ga land at the edge of the sea, between Osu and the old fishing quarters. On ordinary days the ground around it is close to empty — people run at dawn, children play football on the paving, and the arch frames the Atlantic for anyone walking through.",
    culture: "The black star at its summit is the emblem Nkrumah took from Marcus Garvey's Black Star Line and set at the centre of the flag. It is the reason the national football team is called the Black Stars, and the shape turns up on shirts, tro-tros and shopfronts across the country — a piece of pan-African design absorbed entirely into everyday life.",
  },

  "independence-square": {
    people: "Ga",
    language: "Ga",
    livelihood: "Civic and ceremonial",
    festival: {
      name: "Independence Day",
      when: "6 March",
      note: "Thirty thousand people fill the stands facing the sea for the national parade.",
    },
    life: "Black Star Square is enormous and, for most of the year, almost entirely empty — a plain of paving and tiered concrete stands opening onto the Gulf of Guinea. That emptiness is what people use it for: running, football, wedding photographs, and the sea breeze in the evening.",
    culture: "It was commissioned for Queen Elizabeth II's 1961 visit and built to hold a nation looking at itself. Independence Day, church conventions, state funerals and national celebrations all happen on this ground, which makes it less a monument than a room the whole country occasionally stands in.",
  },

  "kwame-nkrumah-mausoleum": {
    people: "Ga",
    language: "Ga",
    livelihood: "Civic, museums and tourism",
    festival: {
      name: "Founders' Day",
      when: "21 September",
      note: "Nkrumah's birthday, marked nationally and observed at the park.",
    },
    life: "The mausoleum stands in a park in central Accra on the Old Polo Grounds — the ground where Nkrumah declared independence at midnight in 1957. It is now one of the calmest places in the middle of the city: fountains, lawns and a museum, a few minutes' walk from the noise of Makola market.",
    culture: "The park has become a place of pilgrimage for pan-Africanists and for the diaspora, particularly since the Year of Return in 2019 drew large numbers of visitors of African descent to Ghana. Nkrumah's reputation at home is more argued over than abroad — he was overthrown in 1966 — and the park is where that argument is most visible.",
  },

  "national-theatre-ghana": {
    people: "Ga",
    language: "Ga, with performance in Twi, Ga and English",
    livelihood: "Performance, teaching and the arts",
    festival: null,
    life: "The theatre sits on Liberia Road in central Accra, between the ministries and the old town. It is a working building rather than a monument: rehearsals, school performances, comedy nights, church services and album launches all pass through it, and the forecourt is a meeting point in the evenings.",
    culture: "It is home to the National Dance Company, the National Symphony Orchestra and the National Theatre Players. Behind them sits the concert party tradition — travelling comic theatre with music that toured Ghana through the twentieth century — and the highlife that grew up alongside it, which is still the sound of Ghanaian public life.",
  },

  "national-mosque-of-ghana": {
    people:
      "A Muslim community drawn from across Ghana and the Sahel — Ga, Dagomba, Hausa, Zabarima and others",
    language: "Hausa is widely spoken as a common language, alongside Ga and Twi",
    livelihood: "Trade, transport and small enterprise",
    festival: {
      name: "Eid al-Fitr and Eid al-Adha",
      when: "Set by the lunar calendar",
      note: "Prayers fill the mosque and the streets around it, followed by visiting and shared meals.",
    },
    life: "Kanda sits beside Nima and Mamobi, neighbourhoods settled through the twentieth century by migrants from northern Ghana, Niger, Nigeria and Mali. They are among Accra's densest and most commercial districts — Nima market runs late, and the streets carry a mix of Hausa, Ga, Twi and Dagbani.",
    culture: "Ghana's religious life is unusually easy-going: Muslims and Christians share streets, schools and public holidays, and the National Chief Imam, Sheikh Osman Nuhu Sharubutu, is widely respected across both. The mosque, finished in 2021 with Turkish support, gave that community a landmark to match the cathedrals.",
  },
};

export function communityFor(slug: string): Community | null {
  return COMMUNITIES[slug] ?? null;
}
