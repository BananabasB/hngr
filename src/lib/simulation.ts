"use client";
import { templates } from "./events";
import { HngrDB, Tribute, EventTemplate, Event, normalizeDatabase } from "./setup";
import { addItem, getDepotPreset, inventoryToPool, ITEM_LABELS } from "./inventory";

function getAliveTributes(db: HngrDB | null | undefined): Tribute[] {
  if (!db || !db.tributes) return [];
  return Object.values(db.tributes).filter((t: any) => t?.health?.physical > 0);
}

// kept just in case — renders a description template into a string
export function renderText(
  parts: (string | { role: string; prop: string })[],
  roles: Record<string, Tribute>
): string {
  return parts
    .map((part) => {
      if (typeof part === "string") return part;
      const [first, ...rest] = part.prop.split(".");
      return (
        rest.reduce(
          (acc: any, key) => acc?.[key],
          (roles[part.role] as any)?.[first]
        ) ?? ""
      );
    })
    .join("");
}

function cloneDb(db: HngrDB): HngrDB {
  return JSON.parse(JSON.stringify(db));
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function maybeSwapRoles<T>(
  roles: Record<string, T>,
  swapProbability = 0.1
): Record<string, T> {
  const roleKeys = Object.keys(roles);
  if (roleKeys.length < 2) return roles;
  if (Math.random() < swapProbability) {
    const idx1 = Math.floor(Math.random() * roleKeys.length);
    let idx2 = Math.floor(Math.random() * roleKeys.length);
    while (idx2 === idx1) {
      idx2 = Math.floor(Math.random() * roleKeys.length);
    }
    const key1 = roleKeys[idx1];
    const key2 = roleKeys[idx2];
    const newRoles = { ...roles };
    const temp = newRoles[key1];
    newRoles[key1] = newRoles[key2];
    newRoles[key2] = temp;
    return newRoles;
  }
  return roles;
}

function summarizePickedItems(itemIds: string[]) {
  const counts = new Map<string, number>();
  for (const itemId of itemIds) {
    counts.set(itemId, (counts.get(itemId) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([itemId, quantity]) => {
      const label = ITEM_LABELS[itemId] ?? itemId;
      return quantity === 1 ? label : `${quantity} ${label.toLowerCase()}`;
    })
    .join(", ")
    .replace(/, ([^,]*)$/, " and $1");
}

export function applyDepotStart(db: HngrDB): Event[] {
  const preset = getDepotPreset(db.depot?.presetId);
  const lootPool = shuffleArray(inventoryToPool(preset.stock));
  const recipients = shuffleArray(getAliveTributes(db));
  const events: Event[] = [];

  if (lootPool.length === 0 || recipients.length === 0) {
    return events;
  }

  for (const tribute of recipients) {
    if (lootPool.length === 0) break;

    const takeCount = Math.min(2, lootPool.length);
    const picked: string[] = [];

    for (let i = 0; i < takeCount; i++) {
      const itemId = lootPool.shift();
      if (!itemId) break;
      addItem(tribute.inventory, itemId, 1);
      picked.push(itemId);
    }

    if (picked.length === 0) continue;

    events.push({
      id: `depot-${tribute.id}-${events.length + 1}`,
      templateId: "depot",
      description: [
        { role: "tribute", prop: "name" },
        " claims ",
        summarizePickedItems(picked),
        " from the Depot.",
      ],
      roles: { tribute: tribute.id },
      day: 1,
    });
  }

  if (events.length === 0) {
    const firstTribute = recipients[0];
    if (firstTribute) {
      events.push({
        id: `depot-${firstTribute.id}-1`,
        templateId: "depot",
        description: [
          { role: "tribute", prop: "name" },
          " reaches the Depot, but it is already stripped bare.",
        ],
        roles: { tribute: firstTribute.id },
        day: 1,
      });
    }
  }

  return events;
}

export function simulateDay(db: HngrDB, templatePool: EventTemplate[] = templates): Event[] {
  const events: Event[] = [];
  const alive = getAliveTributes(db);
  const baseIterations = 6 + Math.floor(Math.random() * 3); // 6 to 8 events per day
  const iterations = Math.min(baseIterations, Math.max(1, alive.length + 1));

  for (let i = 0; i < iterations; i++) {
    const shuffledTemplates = shuffleArray(templatePool);
    // FIX #3: track which tributes are already used this iteration slot
    // note: scoped per-slot, not per whole day — move this Set outside the
    // loop if you want truly unique tributes across the entire day
    const usedTributeIds = new Set<string>();
    let eventAdded = false;

    for (const template of shuffledTemplates) {
      const roles: Record<string, Tribute> = {};
      // FIX #3: filter out already-used tributes before picking
      const eventPool = shuffleArray(alive.filter((t) => !usedTributeIds.has(t.id)));

      if (template.roles) {
        if (eventPool.length < template.roles.length) continue;
        for (const role of template.roles) {
          const tribute = eventPool.shift();
          if (!tribute) break;
          roles[role] = tribute;
        }
        if (Object.keys(roles).length < template.roles.length) continue;
      }

      const finalRoles = maybeSwapRoles(roles, 0.1);

      if (template.conditions && !template.conditions(db, finalRoles)) continue;

      events.push({
        id: template.id,
        templateId: template.id,
        description: template.text,
        roles: Object.fromEntries(
          Object.entries(finalRoles).map(([k, v]) => [k, v.id])
        ),
        day: 0, // placeholder, assigned properly in simulateGame
      });

      // FIX #3: mark all roles in this event as used
      for (const tribute of Object.values(finalRoles)) {
        usedTributeIds.add(tribute.id);
      }

      eventAdded = true;
      break;
    }

    if (!eventAdded) continue;
  }

  return events;
}

export function simulateGame(
  db: HngrDB,
  maxDays?: number,
  depotEventsOverride?: Event[]
): Record<number, Event[]> {
  const allDays: Record<number, Event[]> = {};
  const dbCopy = normalizeDatabase(cloneDb(db));
  let day = 1;

  const totalDays = maxDays !== undefined ? maxDays : Infinity;
  const depotEvents = depotEventsOverride ?? applyDepotStart(dbCopy);

  while (getAliveTributes(dbCopy).length > 1 && day <= totalDays) {
    const regularEvents = simulateDay(dbCopy);
    const events = day === 1 ? [...depotEvents, ...regularEvents] : regularEvents;

    for (const event of events) {
      event.day = day;
    }

    for (const event of events) {
      const template = templates.find((t) => t.id === event.templateId);
      if (!template || !template.effects) continue;

      const roles: Record<string, Tribute> = {};
      for (const [role, tributeId] of Object.entries(event.roles)) {
        const tribute = dbCopy.tributes[tributeId];
        if (tribute) roles[role] = tribute;
      }

      const aliveBefore = getAliveTributes(dbCopy).length;
      const dbBeforeEffect = cloneDb(dbCopy);
      template.effects(dbCopy, roles);
      const aliveAfter = getAliveTributes(dbCopy).length;
      if (aliveAfter === 0 && aliveBefore > 0) {
        Object.assign(dbCopy, dbBeforeEffect);
      }
    }

    allDays[day] = events;
    day++;
  }

  // FIX #2: tiebreaker only runs when no maxDays cap was provided
  // previously this would always run regardless, ignoring the cap entirely
  if (maxDays === undefined) {
    while (getAliveTributes(dbCopy).length > 1) {
      const lethalTemplates = templates.filter(
        (t) => t.type === "kill" || t.type === "kill2" || t.type === "combat"
      );
      const events = simulateDay(dbCopy, lethalTemplates);

      for (const event of events) {
        const template = templates.find((t) => t.id === event.templateId);
        if (!template) continue;

        const roles: Record<string, Tribute> = {};
        for (const [role, tributeId] of Object.entries(event.roles)) {
          const tribute = dbCopy.tributes[tributeId];
          if (tribute) roles[role] = tribute;
        }

        if (template.effects) {
          const aliveBefore = getAliveTributes(dbCopy).length;
          const dbBeforeEffect = cloneDb(dbCopy);
          template.effects(dbCopy, roles);

          const aliveAfter = getAliveTributes(dbCopy).length;
          if (aliveAfter === 0 && aliveBefore > 0) {
            Object.assign(dbCopy, dbBeforeEffect);
            continue;
          }
        }
      }

      for (const event of events) {
        event.day = day;
      }

      allDays[day] = events;
      day++;
    }
  }

  const aliveAtEnd = getAliveTributes(dbCopy);
  const winner = aliveAtEnd[0];

  if (!winner) return allDays;

  allDays[day] = [
    {
      id: "winner",
      templateId: "winner",
      description: [{ role: "winner", prop: "name" }, " wins the game!"],
      roles: { winner: winner.id },
      day,
    },
  ];

  return allDays;
}

export function loadGame(db: HngrDB | null | undefined) {
  if (!db) {
    console.error("loadGame() called with null or undefined db");
    return {};
  }

  // server-side: skip localStorage usage
  if (typeof window === "undefined") {
    return normalizeDatabase(db).events ?? {};
  }

  try {
    const savedDbString = localStorage.getItem("hngrDb");
    if (savedDbString) {
      const savedDb = JSON.parse(savedDbString) as HngrDB;
      return normalizeDatabase(savedDb).events ?? {};
    }
  } catch (e) {
    console.error("loadGame: failed to parse saved data", e);
  }

  // FIX #4: always resimulate from scratch if no localStorage save exists
  // previously stale db.events would be silently returned as-is
  const normalized = normalizeDatabase(db);
  normalized.events = simulateGame(normalized);
  try {
    localStorage.setItem("hngrDb", JSON.stringify(normalized));
  } catch (e) {
    console.warn("loadGame: could not save hngrDb", e);
  }
  return normalized.events ?? {};
}
