"use client"
import { loadGame } from "@/lib/simulation";
import { HngrDB, Tribute } from "@/lib/setup";
import { Gupter } from "next/font/google";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

type Props = {
  data: HngrDB;
};

export default function EventTimeline({ data }: Props) {
  const eventsByDay = loadGame(data);

  return (
    <div className="flex flex-col text-center p-4 gap-4">
      {Object.entries(eventsByDay).map(([day, events]) => (
        <div key={`day-${day}`} className="flex flex-col gap-4">
          <h2 className={`text-3xl font-bold mb-2 ${gupter.className}`}>
            day {day}
          </h2>
          {events.map((event, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2">
              {/* tribute avatars */}
              <div className="flex flex-wrap justify-center gap-2">
                {Object.values(event.roles).map((tributeId) => {
                  const tribute: Tribute | undefined = data.tributes[tributeId];
                  if (!tribute) return null;
                  return (
                    <Avatar key={tribute.id} className="flex flex-col w-20 h-20 items-center">
                      {tribute.image ? (
                        <AvatarImage
                          src={tribute.image}
                          alt={tribute.name}
                          className="object-cover"
                        />
                      ) : (
                        <AvatarFallback>{tribute.name[0]}</AvatarFallback>
                      )}
                    </Avatar>
                  );
                })}
              </div>
              <p>
                {event.description.map((part, i) => {
                  if (typeof part === "string") return part;
                  const tribute = data.tributes[event.roles[part.role]];
                  if (!tribute) return null;
                  const [first, ...rest] = part.prop.split(".");
                  let value: any = (tribute as any)[first];
                  for (const key of rest) {
                    value = value?.[key];
                  }
                  return <span key={i}>{value}</span>;
                })}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
