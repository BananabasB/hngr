import { Pronouns } from "./setup";

export const pronounSets: Record<string, Pronouns> = {
  he: {
    subject: "he",
    object: "him",
    possessive: "his",
    reflexive: "himself",
  },
  she: {
    subject: "she",
    object: "her",
    possessive: "her",
    reflexive: "herself",
  },
  they: {
    subject: "they",
    object: "them",
    possessive: "their",
    reflexive: "themself",
  },
};

export function autocompletePronouns(input: string): Pronouns | null {
  const normalizedInput = input.toLowerCase().trim();
  
  // Check if the input matches any of our pronoun sets
  if (pronounSets[normalizedInput]) {
    return pronounSets[normalizedInput];
  }
  
  // Check if the input matches the subject pronoun of any set
  for (const [key, pronouns] of Object.entries(pronounSets)) {
    if (pronouns.subject === normalizedInput) {
      return pronouns;
    }
  }
  
  return null;
}
