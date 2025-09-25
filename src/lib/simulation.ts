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

function interpolateText(templateText: string, roles: Record<string, Tribute>): string {
  return templateText.replace(/\{(\w+)(?:\.(\w+))?\}/g, (_, roleName, prop) => {
    const tribute = roles[roleName];
    if (!tribute) return '';
    if (prop) {
      // @ts-ignore
      return tribute[prop] ?? '';
    }
    return tribute.name;
  });
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

    const description = interpolateText(template.text, roles);

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

export function simulateGame(db: HngrDB): Event[][] {
  const allDays: Event[][] = [];
  let day = 1;

  while (getAliveTributes(db).length > 1) {
    const dayEvents = simulateDay(db).map(e => ({ ...e, day }));
    allDays.push(dayEvents);
    day++;
  }

  const winner = getAliveTributes(db)[0];
  if (winner) {
    allDays.push([
      {
        id: 'winner',
        templateId: 'winner',
        description: `${winner.name} wins the game!`,
        roles: { winner: winner.id },
        day,
      },
    ]);
  }

  return allDays;
}
