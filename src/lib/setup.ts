import { randomUUID } from "crypto";
import { save, load } from "./localStorage";
import { v4 as uuidv4 } from 'uuid'

export type Relationship = {
  trust: number; // -100 = hates them, 0 = neutral, 100 = fully trusts
  alliance: boolean; // currently allied?
};

export type Tribute = {
  name: string;
  pronouns: Pronouns;
  image: string | null;
  id: string;
  district: number;
  relationships: Record<string, Relationship>; // keyed by other tribute IDs
  health: Health
};

export type Health = {
  mental: number,
  physical: number
}

export type Pronouns = {
  subject: string;   // he / she / they
  object: string;    // him / her / them
  determiner: string; // his / her / their
  pronoun: string;   // his / hers / theirs
};

// reusable story skeleton
export type EventTemplate = {
  id: string;
  type: "kill" | "kill2" | "alliance" | "find" | "feast" | "generic";
  text: string;
  roles: string[];
  effects?: (db: HngrDB, tributes: Record<string, Tribute>) => void;
};

export type Event = {
  id: string;
  templateId: string;
  day: number;
  tributes: Record<string, string>;
  description: string; 
};

// database with tributes + events
export type HngrDB = {
  tributeReferralName: { singular: string; plural: string };
  tributes: Record<string, Tribute>; // tribute ID -> Tribute
  events: Event[];
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
    events: [],
    tributes: {},
  };

  // Create tributes keyed by ID with district information
  for (let district = 1; district <= 12; district++) {
    for (let i = 0; i < 2; i++) {
      const id = uuidv4();
      defaultDB.tributes[id] = {
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        health: { physical: 100, mental: 100},
        id,
        district,
        relationships: {},
      };
    }
  }

  // Populate relationships for each tribute with neutral trust and no alliance for every other tribute
  const allTributes = Object.values(defaultDB.tributes);
  for (const tribute of allTributes) {
    for (const otherTribute of allTributes) {
      if (tribute.id !== otherTribute.id) {
        tribute.relationships[otherTribute.id] = { trust: 0, alliance: false };
      }
    }
  }

  save("hngr-db", defaultDB);
  return defaultDB;
}