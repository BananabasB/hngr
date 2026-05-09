import { load } from "./localStorage";
import { HngrDB } from "./setup";
import { addItem, consumeItem, takeOneItem } from "./inventory";

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
    const tribute = db.tributes[sourceId];
    if (tribute && tribute.health) {
        tribute.health.physical = 0;
    }
}

function generateAllianceId() {
  return globalThis.crypto?.randomUUID?.() ?? `alliance-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getAllianceForTribute(db: HngrDB, tributeId: string) {
  return Object.values(db.alliances ?? {}).find((alliance) =>
    alliance.memberIds.includes(tributeId)
  ) ?? null;
}

export function ensureAlliance(db: HngrDB, memberIds: string[]) {
  const uniqueMemberIds = [...new Set(memberIds)].filter(Boolean);
  if (uniqueMemberIds.length < 2) return null;

  const existingAlliances = uniqueMemberIds
    .map((id) => getAllianceForTribute(db, id))
    .filter((alliance): alliance is NonNullable<typeof alliance> => Boolean(alliance));

  const allianceId = existingAlliances[0]?.id ?? generateAllianceId();
  const alliance = db.alliances[allianceId] ?? {
    id: allianceId,
    memberIds: [],
    inventory: {},
  };

  for (const existing of existingAlliances) {
    for (const memberId of existing.memberIds) {
      if (!alliance.memberIds.includes(memberId)) {
        alliance.memberIds.push(memberId);
      }
    }
    for (const [itemId, quantity] of Object.entries(existing.inventory)) {
      addItem(alliance.inventory, itemId, quantity);
    }
    if (existing.id !== allianceId) {
      delete db.alliances[existing.id];
    }
  }

  for (const memberId of uniqueMemberIds) {
    if (!alliance.memberIds.includes(memberId)) {
      alliance.memberIds.push(memberId);
    }
  }

  db.alliances[allianceId] = alliance;
  return alliance;
}

export function moveOneItemToAlliance(db: HngrDB, tributeId: string) {
  const alliance = getAllianceForTribute(db, tributeId);
  if (!alliance) return null;

  const tribute = db.tributes[tributeId];
  if (!tribute) return null;

  const itemId = takeOneItem(tribute.inventory);
  if (!itemId) return null;

  addItem(alliance.inventory, itemId, 1);
  return itemId;
}

export function canUseItem(db: HngrDB, tributeId: string, itemId: string, quantity = 1) {
  const tribute = db.tributes[tributeId];
  if (!tribute) return false;

  const ownCount = tribute.inventory?.[itemId] ?? 0;
  if (ownCount >= quantity) return true;

  const alliance = getAllianceForTribute(db, tributeId);
  if (!alliance) return false;

  return (alliance.inventory?.[itemId] ?? 0) >= quantity - ownCount;
}

export function consumeItemForTribute(db: HngrDB, tributeId: string, itemId: string, quantity = 1) {
  const tribute = db.tributes[tributeId];
  if (!tribute) return false;

  const ownCount = tribute.inventory?.[itemId] ?? 0;
  const alliance = getAllianceForTribute(db, tributeId);
  const allianceCount = alliance?.inventory?.[itemId] ?? 0;

  if (ownCount + allianceCount < quantity) {
    return false;
  }

  const ownSpend = Math.min(ownCount, quantity);
  if (ownSpend > 0) {
    consumeItem(tribute.inventory, itemId, ownSpend);
  }

  const remaining = quantity - ownSpend;
  if (remaining <= 0) return true;

  if (!alliance) return false;
  return consumeItem(alliance.inventory, itemId, remaining);
}
