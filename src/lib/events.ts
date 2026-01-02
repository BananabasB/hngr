import { EventTemplate } from "./setup";
import { adjustTrust, killTribute } from "./social";
import type { SimulationEventTemplate } from "@/lib/supabase/types";

function getTrust(db: any, fromId: string, toId: string): number {
  return db.social?.trust?.[fromId]?.[toId] ?? 0;
}

function isBackstab(db: any): boolean {
  return Math.random() < 0.05;
}

function isOnlyTwoTributesLeft(db: any): boolean {
  return db.tributes && Object.keys(db.tributes).length === 2;
}

const coreTemplates: EventTemplate[] = [
  {
    id: "arrow-kill",
    type: "kill",
    text: [
      { role: "killer", prop: "name" },
      " kills ",
      { role: "victim", prop: "name" },
      " with ",
      { role: "killer", prop: "pronouns.possessive" }, // fixed shooter -> killer to match roles
      " bow and arrow."
    ],
    roles: ["killer", "victim"],
    conditions(db, { killer, victim }) {
      if (!killer || !victim) return false;
      if (isOnlyTwoTributesLeft(db)) return true;
      const trustKV = getTrust(db, killer.id, victim.id);
      const trustVK = getTrust(db, victim.id, killer.id);
      if (trustKV > 50 && trustVK > 50) {
        return isBackstab(db);
      }
      return true;
    },
    effects(db, { killer, victim }) {
      if (!killer || !victim) return;
      if (Math.random() < 0.95) killTribute(db, victim.id);
      adjustTrust(db, victim.id, killer.id, -30);
      adjustTrust(db, killer.id, victim.id, -30);
    },
  },
  {
    id: "eatFood",
    type: "feast",
    text: [
      { role: "tribute", prop: "name" },
      " eats some food."
    ],
    roles: ["tribute"],
    conditions: (db, { tribute }) => {
      return tribute && tribute.foodLvl >= 1;
    },
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.health.physical += 5;
      tribute.health.mental += 10;
      adjustTrust(db, tribute.id, tribute.id, 5);
    },
  },
  {
    id: "findFood",
    type: "find",
    text: [
      { role: "tribute", prop: "name" },
      " hunts for food and succeeds."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute) return;
      tribute.foodLvl += 2;
      adjustTrust(db, tribute.id, tribute.id, 5);
    }
  },
  {
    id: "stealFood",
    type: "find",
    text: [
      { role: "raider", prop: "name" },
      " raids ",
      { role: "victim", prop: "name" },
      "'s base and finds some food. ",
      { role: "victim", prop: "name" },
      " saw ",
      { role: "raider", prop: "object" },
      "."
    ],
    roles: ["raider", "victim"],
    conditions(db, { raider, victim }) {
      return raider && victim && victim.foodLvl >= 1;
    },
    effects: (db, { raider, victim }) => {
      if (!raider || !victim) return;
      raider.foodLvl += victim.foodLvl;
      victim.foodLvl = 0;
      adjustTrust(db, victim.id, raider.id, -20);
    }
  },
  {
    id: "sponsorFood",
    type: "find",
    text: [
      { role: "tribute", prop: "name" },
      " receives food from an unknown sponsor."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute) return;
      tribute.foodLvl += 5;
      adjustTrust(db, tribute.id, tribute.id, 5);
    }
  },
  {
    id: "arrow-miss",
    type: "generic",
    text: [
      { role: "shooter", prop: "name" },
      " tries to shoot ",
      { role: "target", prop: "name" },
      " using ",
      { role: "shooter", prop: "pronouns.possessive" },
      " arrow, and misses."
    ],
    roles: ["shooter", "target"],
    conditions(db, { shooter, target }) {
      if (!shooter || !target) return false;
      if (isOnlyTwoTributesLeft(db)) return true;
      const trustST = getTrust(db, shooter.id, target.id);
      const trustTS = getTrust(db, target.id, shooter.id);
      if (trustST > 50 && trustTS > 50) {
        return isBackstab(db);
      }
      return true;
    },
    effects: (db, { shooter, target }) => {
      if (!shooter || !target) return;
      adjustTrust(db, target.id, shooter.id, -20);
    },
  },
  {
    id: "roly-poly",
    type: "generic",
    text: [
      { role: "rolypolyer", prop: "name" },
      " does a roly poly for no reason."
    ],
    roles: ["rolypolyer"],
    effects: (db, { rolypolyer }) => {
        if (!rolypolyer) return;
    }
  },
  {
    id: "hornets-kill-both",
    type: "kill",
    text: [
      { role: "killer", prop: "name" },
      " tries to aggravate hornets on a tree using ",
      { role: "killer", prop: "pronouns.possessive" },
      " stick, and kills ",
      { role: "victim", prop: "name" },
      " - but then falls off the tree and dies as well."
    ],
    roles: ["killer", "victim"],
    conditions(db, { killer, victim }) {
      if (!killer || !victim) return false;
      if (isOnlyTwoTributesLeft(db)) return false;
      const trustKV = getTrust(db, killer.id, victim.id);
      const trustVK = getTrust(db, victim.id, killer.id);
      if (trustKV > 50 && trustVK > 50) {
        return isBackstab(db);
      }
      return true; // changed from false to true to allow the event to actually happen
    },
    effects(db, { killer, victim }) {
      if (!killer || !victim) return;
      if (Math.random() < 0.95) killTribute(db, killer.id);
      if (Math.random() < 0.95) killTribute(db, victim.id);
      adjustTrust(db, victim.id, killer.id, -30);
      adjustTrust(db, killer.id, victim.id, -30);
    },
  },
  {
    id: "hornets-kill-victim",
    type: "kill",
    text: [
      { role: "killer", prop: "name" },
      " tries to aggravate hornets on a tree using ",
      { role: "killer", prop: "pronouns.possessive" },
      " stick - killing ",
      { role: "victim", prop: "name" },
      "."
    ],
    roles: ["killer", "victim"],
    conditions(db, { killer, victim }) {
      if (!killer || !victim) return false;
      if (isOnlyTwoTributesLeft(db)) return true;
      const trustKV = getTrust(db, killer.id, victim.id);
      const trustVK = getTrust(db, victim.id, killer.id);
      if (trustKV > 50 && trustVK > 50) {
        return isBackstab(db);
      }
      return true;
    },
    effects(db, { killer, victim }) {
      if (!killer || !victim) return;
      if (Math.random() < 0.95) killTribute(db, victim.id);
      adjustTrust(db, victim.id, killer.id, -30);
      adjustTrust(db, killer.id, victim.id, -30);
    },
  },
  {
    id: "hornets-kill-nobody",
    type: "generic",
    text: [
      { role: "killer", prop: "name" },
      " tries to aggravate hornets on a tree using ",
      { role: "killer", prop: "pronouns.possessive" },
      " stick. the hornets don't attack but ",
      { role: "victim", prop: "name" },
      " sees."
    ],
    roles: ["killer", "victim"],
    effects(db, { killer, victim }) {
      if (!killer || !victim) return;
      adjustTrust(db, victim.id, killer.id, -5);
    },
  },
  {
    id: "suicide",
    type: "kill",
    text: [
      { role: "victim", prop: "name" },
      " takes ",
      { role: "victim", prop: "pronouns.possessive" },
      " own life due to stress."
    ],
    roles: ["victim"],
    conditions: (db, { victim }) => {
      if (!victim || !victim.health) return false;
      return (typeof victim.health.mental === "number" ? victim.health.mental : Infinity) < 20;
    },
    effects: (db, { victim }) => {
      if (!victim) return;
      if (Math.random() < 0.95) killTribute(db, victim.id);
      adjustTrust(db, victim.id, victim.id, -20);
    },
  },
  {
    id: "hornets-kill-killer",
    type: "kill",
    text: [
      { role: "killer", prop: "name" },
      " tries to aggravate hornets on a tree using ",
      { role: "killer", prop: "pronouns.possessive" },
      " stick. the hornets don't attack but ",
      { role: "killer", prop: "name" },
      " falls off the tree and dies."
    ],
    roles: ["killer", "victim"],
    conditions(db, { killer, victim }) {
      if (!killer || !victim) return false;
      if (isOnlyTwoTributesLeft(db)) return true;
      const trustKV = getTrust(db, killer.id, victim.id);
      const trustVK = getTrust(db, victim.id, killer.id);
      if (trustKV > 50 && trustVK > 50) {
        return isBackstab(db);
      }
      return true;
    },
    effects(db, { killer, victim }) {
      // FIX: Added guard for killer and victim
      if (!killer || !victim) return;
      if (Math.random() < 0.95) killTribute(db, killer.id);
      adjustTrust(db, victim.id, killer.id, -30);
      adjustTrust(db, killer.id, victim.id, -30);
    },
  },
  {
    id: "campfire-stories-3",
    type: "generic",
    text: [
      { role: "participant1", prop: "name" },
      ", ",
      { role: "participant2", prop: "name" },
      ", and ",
      { role: "participant3", prop: "name" },
      " share stories around a fire."
    ],
    roles: ["participant1", "participant2", "participant3"],
    effects: (db, roles) => {
      const participants = [
        roles.participant1,
        roles.participant2,
        roles.participant3,
      ].filter(p => p !== undefined && p.id);
      
      for (let i = 0; i < participants.length; i++) {
        for (let j = 0; j < participants.length; j++) {
          if (i !== j) {
            adjustTrust(db, participants[i].id, participants[j].id, 10);
          }
        }
      }
    },
  },
  {
    id: "findFoodFail",
    type: "kill",
    text: [
      { role: "victim", prop: "name" },
      " hunts for food and gets killed by beasts."
    ],
    roles: ["victim"],
    effects: (db, { victim }) => {
      if (!victim) return;
      killTribute(db, victim.id);
    },
  },
  {
    id: "alliance-formed",
    type: "generic",
    text: [
      { role: "tribute1", prop: "name" },
      " and ",
      { role: "tribute2", prop: "name" },
      " form an alliance, strengthening their bond."
    ],
    roles: ["tribute1", "tribute2"],
    effects: (db, { tribute1, tribute2 }) => {
      if (!tribute1 || !tribute2 || !tribute1.health || !tribute2.health) return;
      adjustTrust(db, tribute1.id, tribute2.id, 20);
      adjustTrust(db, tribute2.id, tribute1.id, 20);
      if (tribute1.health.mental) tribute1.health.mental += 2;
      if (tribute2.health.mental) tribute2.health.mental += 2;
    }
  },
  {
    id: "share-food",
    type: "generic",
    text: [
      { role: "giver", prop: "name" },
      " shares food with ",
      { role: "receiver", prop: "name" },
      ", building trust between them."
    ],
    roles: ["giver", "receiver"],
    conditions: (db, { giver, receiver }) => {
      return giver && receiver && giver.foodLvl >= 1;
    },
    effects: (db, { giver, receiver }) => {
      if (!giver || !receiver) return;
      giver.foodLvl -= 1;
      receiver.foodLvl += 1;
      adjustTrust(db, receiver.id, giver.id, 15);
      adjustTrust(db, giver.id, receiver.id, 10);
    },
  },
  {
    id: "campfire-singalong",
    type: "generic",
    text: [
      { role: "participant1", prop: "name" },
      " and ",
      { role: "participant2", prop: "name" },
      " sing songs around the campfire."
    ],
    roles: ["participant1", "participant2"],
    effects: (db, { participant1, participant2 }) => {
      if (!participant1 || !participant2 || !participant1.health || !participant2.health) return;
      adjustTrust(db, participant1.id, participant2.id, 10);
      adjustTrust(db, participant2.id, participant1.id, 10);
      participant1.health.mental += 2;
      participant2.health.mental += 2;
    },
  },
  {
    id: "friendly-argument",
    type: "generic",
    text: [
      { role: "arguer1", prop: "name" },
      " and ",
      { role: "arguer2", prop: "name" },
      " argue about the best survival tactics, but laugh it off."
    ],
    roles: ["arguer1", "arguer2"],
    effects: (db, { arguer1, arguer2 }) => {
      if (!arguer1 || !arguer2 || !arguer1.health || !arguer2.health) return;
      adjustTrust(db, arguer1.id, arguer2.id, 2);
      adjustTrust(db, arguer2.id, arguer1.id, 2);
      arguer1.health.mental += 1;
      arguer2.health.mental += 1;
    }
  },
  {
    id: "share-secret",
    type: "generic",
    text: [
      { role: "sharer", prop: "name" },
      " shares a secret with ",
      { role: "listener", prop: "name" },
      ", deepening their trust."
    ],
    roles: ["sharer", "listener"],
    effects: (db, { sharer, listener }) => {
      if (!sharer || !listener || !listener.health) return;
      adjustTrust(db, listener.id, sharer.id, 12);
      listener.health.mental += 2;
    }
  },
  {
    id: "find-berries",
    type: "find",
    text: [
      { role: "tribute", prop: "name" },
      " finds wild berries and eats them."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.foodLvl += 1;
      tribute.health.physical += 2;
    }
  },
  {
    id: "find-poisonous-berries",
    type: "kill",
    text: [
      { role: "victim", prop: "name" },
      " eats poisonous berries and dies."
    ],
    roles: ["victim"],
    effects: (db, { victim }) => {
      if (!victim) return;
      killTribute(db, victim.id);
    }
  },
  {
    id: "food-poisoning",
    type: "generic",
    text: [
      { role: "tribute", prop: "name" },
      " eats spoiled food and feels ill."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.health.physical -= 5 + Math.floor(Math.random() * 6);
      tribute.health.mental -= 2;
    }
  },
  {
    id: "fishing-success",
    type: "find",
    text: [
      { role: "tribute", prop: "name" },
      " catches a fish from a stream."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.foodLvl += 2;
      tribute.health.physical += 2;
    }
  },
  {
    id: "fishing-fail",
    type: "generic",
    text: [
      { role: "tribute", prop: "name" },
      " tries to fish but catches nothing."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.health.mental -= 1;
    }
  },
  {
    id: "practice-archery",
    type: "training",
    text: [
      { role: "tribute", prop: "name" },
      " practices archery, improving skill and confidence."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.health.mental += 3;
    }
  },
  {
    id: "practice-stealth",
    type: "training",
    text: [
      { role: "tribute", prop: "name" },
      " practices moving silently through the woods."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.health.mental += 2;
    }
  },
  {
    id: "scuffle-minor-injury",
    type: "combat",
    text: [
      { role: "attacker", prop: "name" },
      " and ",
      { role: "defender", prop: "name" },
      " scuffle. ",
      { role: "defender", prop: "name" },
      " is slightly injured."
    ],
    roles: ["attacker", "defender"],
    effects: (db, { attacker, defender }) => {
      if (!attacker || !defender || !defender.health) return;
      defender.health.physical -= 5 + Math.floor(Math.random() * 6);
      adjustTrust(db, defender.id, attacker.id, -10);
      adjustTrust(db, attacker.id, defender.id, -5);
    }
  },
  {
    id: "ambush-fail",
    type: "combat",
    text: [
      { role: "ambusher", prop: "name" },
      " tries to ambush ",
      { role: "target", prop: "name" },
      ", but fails."
    ],
    roles: ["ambusher", "target"],
    effects: (db, { ambusher, target }) => {
      if (!ambusher || !target || !ambusher.health) return;
      adjustTrust(db, target.id, ambusher.id, -10);
      ambusher.health.mental -= 2;
    }
  },
  {
    id: "ambush-success",
    type: "combat",
    text: [
      { role: "ambusher", prop: "name" },
      " ambushes ",
      { role: "target", prop: "name" },
      ", stealing some food."
    ],
    roles: ["ambusher", "target"],
    conditions: (db, { ambusher, target }) => {
      return ambusher && target && target.foodLvl > 0;
    },
    effects: (db, { ambusher, target }) => {
      if (!ambusher || !target) return;
      const amount = Math.min(2, target.foodLvl);
      ambusher.foodLvl += amount;
      target.foodLvl -= amount;
      adjustTrust(db, target.id, ambusher.id, -15);
    }
  },
  {
    id: "trip-and-fall",
    type: "generic",
    text: [
      { role: "tribute", prop: "name" },
      " trips and falls, scraping a knee."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.health.physical -= 2 + Math.floor(Math.random() * 3);
    }
  },
  {
    id: "bee-sting",
    type: "generic",
    text: [
      { role: "tribute", prop: "name" },
      " is stung by a bee."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.health.physical -= 3;
      tribute.health.mental -= 1;
    }
  },
  {
    id: "homesick",
    type: "generic",
    text: [
      { role: "tribute", prop: "name" },
      " feels homesick."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.health.mental -= 5;
    }
  },
  {
    id: "motivated",
    type: "generic",
    text: [
      { role: "tribute", prop: "name" },
      " remembers loved ones and feels motivated."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.health.mental += 6;
    }
  },
  {
    id: "fall-from-cliff",
    type: "kill",
    text: [
      { role: "victim", prop: "name" },
      " slips and falls from a cliff, dying instantly."
    ],
    roles: ["victim"],
    effects: (db, { victim }) => {
      if (!victim) return;
      killTribute(db, victim.id);
    }
  },
  {
    id: "drown-river",
    type: "kill",
    text: [
      { role: "victim", prop: "name" },
      " tries to cross a river and drowns."
    ],
    roles: ["victim"],
    effects: (db, { victim }) => {
      if (!victim) return;
      killTribute(db, victim.id);
    }
  },
  {
    id: "rainstorm",
    type: "generic",
    text: [
      { role: "tribute", prop: "name" },
      " is caught in a rainstorm and gets soaked."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.health.physical -= 2;
      tribute.health.mental -= 1;
    }
  },
  {
    id: "find-shelter",
    type: "generic",
    text: [
      { role: "tribute", prop: "name" },
      " finds a safe place to rest for the night."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.health.physical += 3;
      tribute.health.mental += 3;
    }
  },
  {
    id: "lost-in-woods",
    type: "generic",
    text: [
      { role: "tribute", prop: "name" },
      " gets lost in the woods, losing time and energy."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      if (!tribute || !tribute.health) return;
      tribute.health.physical -= 3;
      tribute.health.mental -= 2;
    }
  },
];

const templates: EventTemplate[] = [...coreTemplates];
let userTemplates: EventTemplate[] = [];

function syncTemplates() {
  templates.length = 0;
  templates.push(...coreTemplates, ...userTemplates);
}

export async function applyUserTemplates(simTemplates: SimulationEventTemplate[], userId?: string) {
  if (!userId) {
    console.warn('No userId provided, skipping custom events');
    userTemplates = [];
    syncTemplates();
    return;
  }

  try {
    const response = await fetch('/api/user/plus-status', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userId}`,
      },
    });

    if (!response.ok) {
      console.warn('Failed to verify hngr+ status, skipping custom events');
      userTemplates = [];
      syncTemplates();
      return;
    }

    const { isPlus } = await response.json();
    if (!isPlus) {
      console.warn('User does not have hngr+ membership, skipping custom events');
      userTemplates = [];
      syncTemplates();
      return;
    }

    userTemplates = simTemplates.map(transformTemplate);
    syncTemplates();
  } catch (error) {
    console.error('Error checking hngr+ status:', error);
    userTemplates = [];
    syncTemplates();
  }
}

syncTemplates();

export { templates };

export function transformTemplate(template: SimulationEventTemplate): EventTemplate {
  const textParts = template.text_template
    .split(/(\{\{[^}]+\}\})/)
    .filter(Boolean)
    .map((part) => {
      if (part.startsWith("{{") && part.endsWith("}}")) {
        const inner = part.slice(2, -2).trim();
        const [role, ...propParts] = inner.split(".");
        return { role, prop: propParts.join(".") || "name" };
      }
      return part;
    });

  return {
    id: template.id,
    type: template.type,
    text: textParts as EventTemplate["text"],
    roles: template.roles,
    source: "user",
  };
}