import { randomUUID } from "crypto";
import { save, load } from "./localStorage";
import { v4 as uuidv4 } from 'uuid'

export type Tribute = {
  name: string;
  pronouns: string[];
  image: string | null;
  id: string;
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
      1: [{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },
        
      ],
      2: [{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },],
      3: [{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },],
      4: [{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },],
      5: [{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },],
      6: [{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },],
      7: [{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },],
      8: [{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },],
      9: [{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },],
      10: [{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },],
      11: [{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },],
      12: [{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },{
        name: "",
        pronouns: [],
        image: null,
        id: uuidv4(),
      },]
    },
  };

  save("hngr-db", defaultDB);
  return defaultDB;
}