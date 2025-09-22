import { EventTemplate } from "./setup";

export const templates: EventTemplate[] = [
    {
        id: "arrow-kill",
        type: "kill",
        text: "{killer.name} kills {victim.name} with a bow and arrow.",
        roles: ["killer", "victim"]
    }
]