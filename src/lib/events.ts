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
