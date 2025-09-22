import { EventTemplate } from "./setup";
import { adjustTrust, killTribute } from "./social";

export const templates: EventTemplate[] = [
  {
    id: "arrow-kill",
    type: "kill",
    text: "{killer.name} kills {victim.name} with {shooter.determiner} bow and arrow.",
    roles: ["killer", "victim"],
    effects(db, {killer, victim}) {
      killTribute(db, victim.id)
    },
  },
  {
    id: "eatFood",
    type: "feast",
    text: "{tribute.name} eats some food.",
    roles: ["tribute"],
    conditions: (db, { victim }) => {
      return victim.foodLvl >= 1;
    },
    effects: (db, { victim }) => {
      victim.health.physical += 5;
      victim.health.mental += 10
    },
  },
  {
    id: "findFood",
    type: "find",
    text: "{tribute.name} hunts for food and succeeds.",
    roles: ["tribute"],
    effects: (db, { tribute }) => {
      tribute.foodLvl += 2
    }
  },
  {
    id: "stealFood",
    type: "find",
    text: "{raider.name} raids {victim.name}'s base and finds some food. {victim.name} saw {raider.object}.",
    roles: ["raider", "victim"],
    conditions(db, { victim }) {
      return victim.foodLvl >= 1
    },
    effects: (db, { raider, victim }) => {
      raider.foodLvl += victim.foodLvl;
      adjustTrust(db, victim.id, raider.id, -20)
    }
  },
  {
    id: "arrow-miss",
    type: "generic",
    text: "{shooter.name} tries to shoot {victim.name} using {shooter.determiner} arrow, and misses.",
    roles: ["shooter", "target"],
    effects: (db, { shooter, target }) => {
      adjustTrust(db, target.id, shooter.id, -20);
    },
  },
  {
    id: "hornets-kill-both",
    type: "kill",
    text: "{killer.name} tries to aggrevate hornets on a tree using {killer.determiner} stick, and kills {victim.name} - but then falls off the tree and dies as well.",
    roles: ["killer", "victim"],
    effects(db, {killer, victim}) {
      killTribute(db, killer.id);
      killTribute(db, victim.id)
    },
    },
  {
    id: "hornets-kill-victim",
    type: "kill",
    text: "{killer.name} tries to aggrevate hornets on a tree using {killer.determiner} stick - killing {victim.name}.",
    roles: ["killer", "victim"],
    effects(db, {killer, victim}) {
        killTribute(db, victim.id)
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
    },
  },
  {
    id: "hornets-kill-killer",
    type: "kill",
    text: "{killer.name} tries to aggrevate hornets on a tree using {killer.determiner} stick. the hornets don't attack but {killer.object} falls off the tree and dies.",
    roles: ["killer", "victim"],
    effects(db, {killer, victim}) {
        killTribute(db, victim.id)
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
];
