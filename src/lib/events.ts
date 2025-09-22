import { EventTemplate } from "./setup";
import { adjustTrust } from "./social";

export const templates: EventTemplate[] = [
    {
        id: "arrow-kill",
        type: "kill",
        text: "{killer.name} kills {victim.name} with {shooter.determiner} bow and arrow.",
        roles: ["killer", "victim"],
    },
    {
        id: "arrow-miss",
        type: "generic",
        text: "{shooter.name} tries to shoot {victim.name} using {shooter.determiner} arrow, and misses.",
        roles: ["shooter", "target"],
        effects: (db, { shooter, target }) => {
            adjustTrust(db, target.id, shooter.id, -20)
        },
    }
]