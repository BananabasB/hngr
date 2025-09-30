import { templates } from './events';
import { HngrDB, Tribute, EventTemplate, Event } from './setup';
import { killTribute, adjustTrust } from './social';

function getAliveTributes(db: HngrDB | null | undefined): Tribute[] {
  if (!db || !db.tributes) return [];
  return Object.values(db.tributes).filter(
    (t: any) => t?.health?.physical > 0
  );
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function renderText(parts: (string | { role: string; prop: string })[], roles: Record<string, Tribute>): string {
  return parts.map(part => {
    if (typeof part === "string") return part;
    const [first, ...rest] = part.prop.split(".");
    return rest.reduce((acc: any, key) => acc?.[key], (roles[part.role] as any)?.[first]) ?? "";
  }).join("");
}

export function simulateDay(db: HngrDB): Event[] {
  const events: Event[] = [];
  const alive = getAliveTributes(db);
  const iterations = 6 + Math.floor(Math.random() * 2); // 6 or 7 events per day

  for (let i = 0; i < iterations; i++) {
    const template = pickRandom(templates);
    const roles: Record<string, Tribute> = {};

    // Assign tributes to roles
    if (template.roles) {
      let valid = true;
      for (const role of template.roles) {
        const aliveTributes = getAliveTributes(db).filter(t => !Object.values(roles).includes(t));
        if (aliveTributes.length === 0) {
          valid = false;
          break;
        }
        roles[role] = pickRandom(aliveTributes);
      }
      if (!valid || Object.keys(roles).length < template.roles.length) {
        continue; // skip this event if not all roles could be filled
      }
    }

    if (template.conditions && !template.conditions(db, roles)) {
      continue;
    }

    if (template.effects) {
      template.effects(db, roles);
    }

    const description = template.text;

    events.push({
      id: template.id,
      templateId: template.id,
      description,
      roles: Object.fromEntries(
        Object.entries(roles).map(([k, v]) => [k, v.id])
      ),
      day: 0, // Placeholder, can be updated to reflect the real day number if needed
    });
  }

  return events;
}

export function loadGame(db: HngrDB) {
  const savedDbString = localStorage.getItem("hngrDb");
  if (savedDbString) {
    const savedDb = JSON.parse(savedDbString) as HngrDB;
    return savedDb.events;
  }
  if (Object.keys(db.events).length === 0) {
    db.events = simulateGame(db);
    localStorage.setItem("hngrDb", JSON.stringify(db));
  }
  return db.events;
}

export function simulateGame(db: HngrDB): Record<number, Event[]> {
  const allDays: Record<number, Event[]> = {};
  let day = 1;

  while (getAliveTributes(db).length > 1) {
    const dayEvents = simulateDay(db).map(e => ({ ...e, day }));
    allDays[day] = dayEvents;
    day++;
  }

  const winner = getAliveTributes(db)[0];
  if (winner) {
    allDays[day] = [
      {
        id: 'winner',
        templateId: 'winner',
        description: [{ role: "winner", prop: "name" }, " wins the game!"],
        roles: { winner: winner.id },
        day,
      },
    ];
  }

  return allDays;
}