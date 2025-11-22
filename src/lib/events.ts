import { EventTemplate } from "./setup";
import { adjustTrust, killTribute } from "./social";

function getTrust(db: any, fromId: string, toId: string): number {
  return db.social?.trust?.[fromId]?.[toId] ?? 0;
}

function isBackstab(db: any): boolean {
  return Math.random() < 0.05;
}

function isOnlyTwoTributesLeft(db: any): boolean {
  return db.tributes && Object.keys(db.tributes).length === 2;
}

export const templates: EventTemplate[] = [
  {
    id: "arrow-kill",
    type: "kill",
    text: [
      { role: "killer", prop: "name" },
      " kills ",
      { role: "victim", prop: "name" },
      " with ",
      { role: "shooter", prop: "pronouns.possessive" },
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
    effects(db, {killer, victim}) {
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
      return tribute.foodLvl >= 1;
    },
    effects: (db, { tribute }) => {
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
    conditions(db, { victim }) {
      return victim.foodLvl >= 1;
    },
    effects: (db, { raider, victim }) => {
      raider.foodLvl += victim.foodLvl;
      victim.foodLvl -= victim.foodLvl;
      adjustTrust(db, victim.id, raider.id, -20);
    }
  },
  {
    id: "sponsorFood",
    type: "find",
    text: [
      { role: "tribute", prop: "name" },
      " recieves food from an unknown sponsor."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
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
      { role: "victim", prop: "name" },
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
  },
  {
    id: "hornets-kill-both",
    type: "kill",
    text: [
      { role: "killer", prop: "name" },
      " tries to aggrevate hornets on a tree using ",
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
      return false;
    },
    effects(db, {killer, victim}) {
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
      " tries to aggrevate hornets on a tree using ",
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
    effects(db, {killer, victim}) {
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
      " tries to aggrevate hornets on a tree using ",
      { role: "killer", prop: "pronouns.possessive" },
      " stick. the hornets don't attack but ",
      { role: "victim", prop: "name" },
      " sees."
    ],
    roles: ["killer", "victim"],
    effects(db, {killer, victim}) {
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
      // only allow this event when the victim exists and mental health is low
      if (!victim || !victim.health) return false;
      // tolerate missing numeric values by treating them as high mental health
      return (typeof victim.health.mental === "number" ? victim.health.mental : Infinity) < 20;
    },
    effects: (db, { victim }) => {
      if (Math.random() < 0.95) killTribute(db, victim.id);
      adjustTrust(db, victim.id, victim.id, -20);
    },
  },
  {
    id: "hornets-kill-killer",
    type: "kill",
    text: [
      { role: "killer", prop: "name" },
      " tries to aggrevate hornets on a tree using ",
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
    effects(db, {killer, victim}) {
      if (Math.random() < 0.95) killTribute(db, victim.id); // <-- This looks like a typo, should it be killer.id?
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
      ];
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
      victim.health.physical == 0; // <-- This is likely a bug, should be killTribute(db, victim.id) or victim.health.physical = 0
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
      adjustTrust(db, tribute1.id, tribute2.id, 20);
      adjustTrust(db, tribute2.id, tribute1.id, 20);
    },
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
    conditions: (db, { giver }) => {
      return giver.foodLvl >= 1;
    },
    effects: (db, { giver, receiver }) => {
      giver.foodLvl -= 1;
      receiver.foodLvl += 1;
      adjustTrust(db, receiver.id, giver.id, 15);
      adjustTrust(db, giver.id, receiver.id, 10);
    },
  },
  // --- THIS IS WHERE THE ERROR WAS ---
  // The ]; was here, now it's gone.

  // Social & Trust-building events
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
      adjustTrust(db, listener.id, sharer.id, 12);
      listener.health.mental += 2;
    }
  },
  // Food-related events
  {
    id: "find-berries",
    type: "find",
    text: [
      { role: "tribute", prop: "name" },
      " finds wild berries and eats them."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
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
      tribute.health.physical -= 5 + Math.floor(Math.random() * 6); // -5 to -10
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
      tribute.health.mental -= 1;
    }
  },
  // Training/Skill events
  {
    id: "practice-archery",
    type: "training",
    text: [
      { role: "tribute", prop: "name" },
      " practices archery, improving skill and confidence."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
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
      tribute.health.mental += 2;
    }
  },
  // Minor combat events (non-lethal)
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
      defender.health.physical -= 5 + Math.floor(Math.random() * 6); // -5 to -10
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
    conditions: (db, { target }) => {
      return target.foodLvl > 0;
    },
    effects: (db, { ambusher, target }) => {
      const amount = Math.min(2, target.foodLvl);
      ambusher.foodLvl += amount;
      target.foodLvl -= amount;
      adjustTrust(db, target.id, ambusher.id, -15);
    }
  },
  // Minor accidents
  {
    id: "trip-and-fall",
    type: "generic",
    text: [
      { role: "tribute", prop: "name" },
      " trips and falls, scraping a knee."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      tribute.health.physical -= 2 + Math.floor(Math.random() * 3); // -2 to -4
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
      tribute.health.physical -= 3;
      tribute.health.mental -= 1;
    }
  },
  // Minor mental events
  {
    id: "homesick",
    type: "generic",
    text: [
      { role: "tribute", prop: "name" },
      " feels homesick."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
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
      tribute.health.mental += 6;
    }
  },
  // Deaths that must always kill
  {
    id: "fall-from-cliff",
    type: "kill",
    text: [
      { role: "victim", prop: "name" },
      " slips and falls from a cliff, dying instantly."
    ],
    roles: ["victim"],
    effects: (db, { victim }) => {
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
      killTribute(db, victim.id);
    }
  },
  // Other generic/minor events
  {
    id: "rainstorm",
    type: "generic",
    text: [
      { role: "tribute", prop: "name" },
      " is caught in a rainstorm and gets soaked."
    ],
    roles: ["tribute"],
    effects: (db, { tribute }) => {
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
      tribute.health.physical -= 3;
      tribute.health.mental -= 2;
    }
  },
];