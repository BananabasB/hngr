import { randomUUID } from "crypto";
import { save, load } from "./localStorage";
import { v4 as uuidv4 } from 'uuid'

export type Tribute = {
  name: string;
  pronouns: Pronouns;
  image: string | null;
  id: string;
};

export type Pronouns = {
  subject: string;   // he / she / they
  object: string;    // him / her / them
  determiner: string; // his / her / their
  pronoun: string;   // his / hers / theirs
};

// reusable story skeleton
export type EventTemplate = {
  id: string;
  type: "kill" | "alliance" | "find" | "feast" | "generic";
  text: string;
  roles: string[];
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
  tributes: Record<number, Tribute[]>; // district -> tributes
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
    tributes: {
      1: [{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },
      ],
      2: [{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },],
      3: [{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },],
      4: [{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },],
      5: [{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },],
      6: [{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },],
      7: [{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },],
      8: [{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },],
      9: [{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },],
      10: [{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },],
      11: [{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },],
      12: [{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: { subject: "", object: "", determiner: "", pronoun: "" },
        image: null,
        id: uuidv4(),
      },]
    },
  };

  save("hngr-db", defaultDB);
  return defaultDB;
}