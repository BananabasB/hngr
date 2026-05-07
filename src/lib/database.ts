// Simple database module for HNGR

import { HngrDB } from './setup';

export function updateReferralName(db: HngrDB, value: "tributes" | "volunteers" | "nominees"): HngrDB {
  const referralNames = {
    tributes: { singular: "tribute", plural: "tributes" },
    volunteers: { singular: "volunteer", plural: "volunteers" },
    nominees: { singular: "nominee", plural: "nominees" }
  };

  return {
    ...db,
    tributeReferralName: referralNames[value]
  };
}
