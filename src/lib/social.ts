import { load } from "./localStorage";
import { HngrDB } from "./setup";

export function adjustTrust(
  db: HngrDB,
  sourceId: string,
  targetId: string,
  delta: number
) {
  const tribute = findTribute(db, sourceId);
  if (tribute && tribute.relationships[targetId]) {
    tribute.relationships[targetId].trust += delta;
  }
}

export function setAlliance(
  db: HngrDB,
  id1: string,
  id2: string,
  alliance: boolean
) {
  const t1 = findTribute(db, id1);
  const t2 = findTribute(db, id2);
  if (t1 && t2) {
    t1.relationships[id2].alliance = alliance;
    t2.relationships[id1].alliance = alliance;
  }
}

export function findTribute(db: HngrDB, sourceId: string) {
    return db.tributes[sourceId]
}

export function killTribute(db: HngrDB, sourceId: string) {
    db.tributes[sourceId].health.physical = 0;
}