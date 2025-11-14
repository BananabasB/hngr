"use client";
import { templates } from "./events";
import { HngrDB, Tribute, EventTemplate, Event } from "./setup";
import { killTribute, adjustTrust } from "./social";

function getAliveTributes(db: HngrDB | null | undefined): Tribute[] {
  if (!db || !db.tributes) return [];
  return Object.values(db.tributes).filter((t: any) => t?.health?.physical > 0);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function renderText(
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

export function simulateDay(db: HngrDB): Event[] {
  const dbCopy = cloneDb(db);
  const events: Event[] = [];
  const alive = getAliveTributes(dbCopy);
  const iterations = 8 + Math.floor(Math.random() * 3); // 8 to 10 events per day

  for (let i = 0; i < iterations; i++) {
    const shuffledTemplates = shuffleArray(templates);
    let eventAdded = false;

    for (const template of shuffledTemplates) {
      const roles: Record<string, Tribute> = {};
      const eventPool = shuffleArray(alive);

      if (template.roles) {
        if (eventPool.length < template.roles.length) {
          continue; // Not enough tributes to fill all roles
        }
        for (const role of template.roles) {
          const tribute = eventPool.shift();
          if (!tribute) break;
          roles[role] = tribute;
        }
        if (Object.keys(roles).length < template.roles.length) {
          continue; // skip if not all roles could be filled
        }
      }

      const finalRoles = maybeSwapRoles(roles, 0.1);

      if (template.conditions && !template.conditions(dbCopy, finalRoles)) {
        continue;
      }

      if (template.effects) {
        template.effects(dbCopy, finalRoles);
      }

      const description = template.text;

      events.push({
        id: template.id,
        templateId: template.id,
        description,
        roles: Object.fromEntries(
          Object.entries(finalRoles).map(([k, v]) => [k, v.id])
        ),
        day: 0, // Placeholder, can be updated to reflect the real day number if needed
      });

      eventAdded = true;
      break; // Move to next iteration after adding an event
    }

    if (!eventAdded) {
      // No valid event found this iteration, skip
      continue;
    }
  }

  return events;
}

export function simulateGame(
  db: HngrDB,
  maxDays?: number
): Record<number, Event[]> {
  const allDays: Record<number, Event[]> = {};
  const dbCopy = cloneDb(db);
  let day = 1;

  const totalDays = maxDays !== undefined ? maxDays : Infinity;

  while (getAliveTributes(dbCopy).length > 1 && day <= totalDays) {
    const events = simulateDay(dbCopy);

    // Apply event effects to dbCopy for each event
    for (const event of events) {
      const template = templates.find((t) => t.id === event.templateId);
      if (!template) continue;

      const roles: Record<string, Tribute> = {};
      for (const [role, tributeId] of Object.entries(event.roles)) {
        const tribute = dbCopy.tributes[tributeId];
        if (tribute) {
          roles[role] = tribute;
        }
      }

      if (template.effects) {
        const aliveBefore = getAliveTributes(dbCopy).length;
        const dbBeforeEffect = cloneDb(dbCopy);
        template.effects(dbCopy, roles);
        const aliveAfter = getAliveTributes(dbCopy).length;
        if (aliveAfter === 0 && aliveBefore > 0) {
          Object.assign(dbCopy, dbBeforeEffect);
          // Skip applying this event's effects to avoid killing everyone
          continue;
        }
      }
    }

    // Assign the correct day number to each event
    for (const event of events) {
      event.day = day;
    }

    allDays[day] = events;
    day++;
  }

  while (getAliveTributes(dbCopy).length > 1) {
    const lethalTemplates = templates.filter(
      (t) => t.type === "kill" || t.type === "kill2" || t.type === "combat"
    );
    const originalTemplates = templates.slice();

    (templates as any).length = 0;
    lethalTemplates.forEach((t) => (templates as any).push(t));

    const events = simulateDay(dbCopy);

    (templates as any).length = 0;
    originalTemplates.forEach((t) => (templates as any).push(t));

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

  const aliveAtEnd = getAliveTributes(dbCopy);
  const winner = aliveAtEnd[0];

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
    return db.events ?? {};
  }

  try {
    const savedDbString = localStorage.getItem("hngrDb");
    if (savedDbString) {
      const savedDb = JSON.parse(savedDbString) as HngrDB;
      return savedDb.events ?? {};
    }
  } catch (e) {
    console.error("loadGame: failed to parse saved data", e);
  }

  if (!db.events || Object.keys(db.events).length === 0) {
    db.events = simulateGame(db);
    try {
      localStorage.setItem("hngrDb", JSON.stringify(db));
    } catch (e) {
      console.warn("loadGame: could not save hngrDb", e);
    }
  }

  return db.events ?? {};
}
