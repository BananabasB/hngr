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
    text: "{killer.name} kills {victim.name} with {shooter.determiner} bow and arrow.",
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
      killTribute(db, victim.id);
      adjustTrust(db, victim.id, killer.id, -30);
      adjustTrust(db, killer.id, victim.id, -30);
    },
  },
  {
    id: "eatFood",
    type: "feast",
    text: "{tribute.name} eats some food.",
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
    text: "{tribute.name} hunts for food and succeeds.",
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      tribute.foodLvl += 2;
      adjustTrust(db, tribute.id, tribute.id, 5);
    }
  },
  {
    id: "stealFood",
    type: "find",
    text: "{raider.name} raids {victim.name}'s base and finds some food. {victim.name} saw {raider.object}.",
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
    text: "{tribute.name} recieves food from an unknown sponsor.",
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      tribute.foodLvl += 5;
      adjustTrust(db, tribute.id, tribute.id, 5);
    }
  },
  {
    id: "arrow-miss",
    type: "generic",
    text: "{shooter.name} tries to shoot {victim.name} using {shooter.determiner} arrow, and misses.",
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
    id: "hornets-kill-both",
    type: "kill",
    text: "{killer.name} tries to aggrevate hornets on a tree using {killer.determiner} stick, and kills {victim.name} - but then falls off the tree and dies as well.",
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
      killTribute(db, killer.id);
      killTribute(db, victim.id);
      adjustTrust(db, victim.id, killer.id, -30);
      adjustTrust(db, killer.id, victim.id, -30);
    },
  },
  {
    id: "hornets-kill-victim",
    type: "kill",
    text: "{killer.name} tries to aggrevate hornets on a tree using {killer.determiner} stick - killing {victim.name}.",
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
      killTribute(db, victim.id);
      adjustTrust(db, victim.id, killer.id, -30);
      adjustTrust(db, killer.id, victim.id, -30);
    },
  },
  {
    id: "hornets-kill-nobody",
    type: "generic",
    text: "{killer.name} tries to aggrevate hornets on a tree using {killer.determiner} stick. the hornets don't attack but {victim.name} sees.",
    roles: ["killer", "victim"],
    effects(db, {killer, victim}) {
      adjustTrust(db, victim.id, killer.id, -5);
    },
  },
  {
    id: "suicide",
    type: "kill",
    text: "{victim.name} takes {victim.determiner} own life due to stress.",
    roles: ["victim"],
    conditions: (db, { victim }) => {
      // only allow this event when the victim exists and mental health is low
      if (!victim || !victim.health) return false;
      // tolerate missing numeric values by treating them as high mental health
      return (typeof victim.health.mental === "number" ? victim.health.mental : Infinity) < 20;
    },
    effects: (db, { victim }) => {
      killTribute(db, victim.id);
      adjustTrust(db, victim.id, victim.id, -20);
    },
  },
  {
    id: "hornets-kill-killer",
    type: "kill",
    text: "{killer.name} tries to aggrevate hornets on a tree using {killer.determiner} stick. the hornets don't attack but {killer.object} falls off the tree and dies.",
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
      killTribute(db, victim.id);
      adjustTrust(db, victim.id, killer.id, -30);
      adjustTrust(db, killer.id, victim.id, -30);
    },
  },
  {
    id: "campfire-stories-3",
    type: "generic",
    text: "{participant1.name}, {participant2.name}, and {participant3.name} share stories around a fire.",
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
    id: "alliance-formed",
    type: "generic",
    text: "{tribute1.name} and {tribute2.name} form an alliance, strengthening their bond.",
    roles: ["tribute1", "tribute2"],
    effects: (db, { tribute1, tribute2 }) => {
      adjustTrust(db, tribute1.id, tribute2.id, 20);
      adjustTrust(db, tribute2.id, tribute1.id, 20);
    },
  },
  {
    id: "share-food",
    type: "generic",
    text: "{giver.name} shares food with {receiver.name}, building trust between them.",
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
];
