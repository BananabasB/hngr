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
      1: [{
        name: "",
        pronouns: [],
        image: null
      },{
        name: "",
        pronouns: [],
        image: null
      },
        
      ],
      2: [{
        name: "",
        pronouns: [],
        image: null
      },{
        name: "",
        pronouns: [],
        image: null
      },],
      3: [{
        name: "",
        pronouns: [],
        image: null
      },{
        name: "",
        pronouns: [],
        image: null
      },],
      4: [{
        name: "",
        pronouns: [],
        image: null
      },{
        name: "",
        pronouns: [],
        image: null
      },],
      5: [{
        name: "",
        pronouns: [],
        image: null
      },{
        name: "",
        pronouns: [],
        image: null
      },],
      6: [{
        name: "",
        pronouns: [],
        image: null
      },{
        name: "",
        pronouns: [],
        image: null
      },],
      7: [{
        name: "",
        pronouns: [],
        image: null
      },{
        name: "",
        pronouns: [],
        image: null
      },],
      8: [{
        name: "",
        pronouns: [],
        image: null
      },{
        name: "",
        pronouns: [],
        image: null
      },],
      9: [{
        name: "",
        pronouns: [],
        image: null
      },{
        name: "",
        pronouns: [],
        image: null
      },],
      10: [{
        name: "",
        pronouns: [],
        image: null
      },{
        name: "",
        pronouns: [],
        image: null
      },],
      11: [{
        name: "",
        pronouns: [],
        image: null
      },{
        name: "",
        pronouns: [],
        image: null
      },],
      12: [{
        name: "",
        pronouns: [],
        image: null
      },{
        name: "",
        pronouns: [],
        image: null
      },]
    },
  };

  save("hngr-db", defaultDB);
  return defaultDB;
}