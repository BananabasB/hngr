import { save, load } from "./localStorage";

export type Tribute = {
  name: string;
  pronouns: string[];
  image: string | null;
};

export type HngrDB = {
  tributeReferralName: {
    singular: string;
    plural: string;
  };
  tributes: Record<number, Tribute[]>;
};

export function setupDatabase() {
  // see if it already exists
  const existing = load<HngrDB>("hngr-db");
  if (existing) return existing;

  // make fresh database
  const defaultDB: HngrDB = {
    tributeReferralName: {
      singular: "tribute",
      plural: "tributes",
    },
    tributes: {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
      10: [],
      11: [],
      12: []
    },
  };

  save("hngr-db", defaultDB);
  return defaultDB;
}