export type SlangEntry = { word: string; meaning: string; example: string };
export type SlangDB = Record<string, SlangEntry[]>;

export const SLANG_DB: SlangDB = {
  london: [
    { word: "Peng", meaning: "attractive or good-looking", example: "She's peng innit?" },
    { word: "Mandem", meaning: "group of friends or associates", example: "I'm with the mandem tonight." },
    { word: "Bands", meaning: "large amounts of money", example: "Got bare bands in my pocket." },
    { word: "Skeng", meaning: "a weapon, usually a knife", example: "Don't bring skeng here." },
    { word: "Waste man", meaning: "useless or annoying person", example: "He's a proper waste man." },
    { word: "Feds", meaning: "the police", example: "Feds are watching." },
    { word: "Endz", meaning: "neighbourhood or area", example: "From South Endz." },
    { word: "Wagwan", meaning: "what's up greeting", example: "Wagwan fam?" },
    { word: "Link up", meaning: "meet up", example: "Let's link up later." },
    { word: "Grind", meaning: "work hard", example: "On my grind daily." },
    { word: "Yute", meaning: "young person", example: "That yute is cheeky." },
    { word: "Chirps", meaning: "flirt or chat up", example: "He chirps all the gyals." },
    { word: "Gyaldem", meaning: "group of girls", example: "Gyaldem over there." },
    { word: "Pagans", meaning: "enemies or rivals", example: "Pagans from other ends." },
    { word: "Bait", meaning: "obvious or noticeable", example: "That's too bait man." },
    { word: "Garms", meaning: "clothing", example: "Fresh garms today." },
    { word: "Gassed", meaning: "excited or hyped", example: "I'm gassed for this." },
    { word: "Safe", meaning: "cool or all good", example: "Safe journey bro." },
    { word: "Allow it", meaning: "let it go or stop", example: "Allow it, no drama." },
    { word: "Bruv", meaning: "brother or bro", example: "What's good bruv?" },
    { word: "Bare", meaning: "a lot or many", example: "Bare man at the party." },
    { word: "Clapped", meaning: "unattractive or ugly", example: "That fit is clapped." },
    { word: "Dench", meaning: "good or excellent", example: "Tune is dench." },
    { word: "Whips", meaning: "cars or vehicles", example: "Nice whips parked up." },
    { word: "Truss", meaning: "trust or believe", example: "I truss you bruv." },
  ],
  brooklyn: [
    { word: "718", meaning: "Brooklyn area code", example: "Reppin' the 718." },
    { word: "Dead ass", meaning: "seriously", example: "Dead ass true." },
    { word: "Bet", meaning: "agreed", example: "Bet, see you there." },
    { word: "No cap", meaning: "no lie", example: "No cap, best ever." },
    { word: "Shook", meaning: "shocked", example: "I'm shook fam." },
    { word: "Sus", meaning: "suspicious", example: "That looks sus." },
    { word: "Shorty", meaning: "attractive woman", example: "Hey shorty." },
    { word: "Mad", meaning: "very or really", example: "Mad cold out here." },
    { word: "Lit", meaning: "fun or amazing", example: "Party was lit." },
    { word: "Swerve", meaning: "avoid or reject", example: "Swerve that drama." },
    { word: "Feening", meaning: "desperately wanting", example: "Stop feening for it." },
    { word: "Dub", meaning: "something to avoid", example: "That's a dub." },
    { word: "Whip", meaning: "nice car", example: "New whip dropped." },
    { word: "Ock", meaning: "bodega counter guy", example: "Ock hooked me up." },
  ],
  jamaican: [
    { word: "Wagwan", meaning: "what's going on", example: "Wagwan mi bredda?" },
    { word: "Irie", meaning: "good or cool", example: "Everything irie." },
    { word: "Bredda", meaning: "brother", example: "Mi bredda come." },
    { word: "Bashment", meaning: "party", example: "Big bashment tonight." },
    { word: "Nuff", meaning: "a lot", example: "Nuff food deh ya." },
    { word: "Yard", meaning: "home or Jamaica", example: "Gwaan yard." },
    { word: "Bangarang", meaning: "commotion", example: "What a bangarang." },
    { word: "Batty", meaning: "butt", example: "Move yuh batty." },
    { word: "Lick", meaning: "hit", example: "Lick him one time." },
  ],
  tokyo: [
    { word: "Maji", meaning: "really / seriously", example: "Maji yabai!" },
    { word: "Yabai", meaning: "dangerous or awesome", example: "Kore yabai ne." },
    { word: "Cho", meaning: "super / very", example: "Cho kawaii." },
    { word: "Gyau", meaning: "gyaru girl style", example: "Ano ko gyau da yo." },
  ],
  paris: [
    { word: "Ouf", meaning: "crazy (verlan of fou)", example: "T'es ouf ou quoi?" },
    { word: "Reuf", meaning: "brother (verlan of frère)", example: "Mon reuf." },
    { word: "Iench", meaning: "dog / insult (verlan of chien)", example: "T'es un iench." },
    { word: "Tromé", meaning: "metro (verlan)", example: "Prends le tromé." },
    { word: "Zicmu", meaning: "music (verlan of musique)", example: "Écoute du zicmu." },
    { word: "Lepou", meaning: "police (verlan of poulet)", example: "Les lepou arrivent." },
    { word: "Ripou", meaning: "corrupt cop (verlan of pourri)", example: "C'est un ripou." },
  ],
  russian: [
    { word: "Gopnik", meaning: "hoodlum / lout", example: "Te gopniki tam." },
    { word: "Pizdets", meaning: "total disaster", example: "Pizdets polnyy." },
    { word: "Blat", meaning: "connections / influence", example: "U menya blat." },
  ],
  lisbon: [
    { word: "Fixe", meaning: "cool", example: "Isso é fixe." },
    { word: "Ganda", meaning: "beautiful / great", example: "Ganda malta." },
  ],
  mexico: [
    { word: "Wey", meaning: "dude", example: "Qué onda wey." },
    { word: "Chido", meaning: "cool", example: "Está chido." },
    { word: "Órale", meaning: "ok / hurry up", example: "Órale carnal." },
    { word: "No manches", meaning: "no way", example: "No manches güey." },
    { word: "Naco", meaning: "trashy / low class", example: "Ese tipo naco." },
    { word: "Chilango", meaning: "Mexico City person", example: "Soy chilango." },
  ],
  rio: [
    { word: "Rolê", meaning: "outing / hangout", example: "Bora no rolê." },
    { word: "Mano", meaning: "bro", example: "E aí mano." },
    { word: "Parça", meaning: "partner / bro", example: "Meu parça." },
    { word: "Quebrada", meaning: "hood / slum", example: "Da quebrada." },
  ],
  israeli: [
    { word: "Sababa", meaning: "cool / ok", example: "Sababa yala." },
    { word: "Yalla", meaning: "let's go / hurry", example: "Yalla habibi." },
    { word: "Balagan", meaning: "chaos / mess", example: "Balagan po." },
    { word: "Stam", meaning: "just / random", example: "Ze stam." },
    { word: "Chutzpah", meaning: "audacity / nerve", example: "Ze chutzpah." },
    { word: "Slicha", meaning: "sorry", example: "Slicha mach." },
    { word: "Mach", meaning: "fast / quick", example: "Mach lachshov." },
  ],
};

const DIALECT_TO_DB_KEY: Record<string, string> = {
  "London Roadman": "london",
  "New York Brooklyn": "brooklyn",
  "Jamaican Patois": "jamaican",
  "Tokyo Gyaru": "tokyo",
  "Paris Banlieue": "paris",
  "Russian Street": "russian",
  "Lisbon Street": "lisbon",
  "Mexico City Barrio": "mexico",
  "Rio Favela": "rio",
  "Israeli Street": "israeli",
};

export function lookupSlang(word: string, dialect: string): SlangEntry | null {
  const key = DIALECT_TO_DB_KEY[dialect] ?? "";
  const entries = SLANG_DB[key] ?? [];
  const normalized = word.toLowerCase().trim();
  return entries.find((e) => e.word.toLowerCase() === normalized) ?? null;
}
