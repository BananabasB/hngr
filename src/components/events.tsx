"use client";
import { useState, useEffect } from "react";
import { loadGame, simulateGame } from "@/lib/simulation";
import { HngrDB, Tribute } from "@/lib/setup";
import { Gupter } from "next/font/google";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "./ui/button";
import { Shuffle, Trash } from "lucide-react";
import { remove } from "@/lib/localStorage";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./ui/dialog";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });

type Props = {
  data: HngrDB;
};

function shuffleArray<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function EventTimeline({ data }: Props) {
  // prefer any here because loadGame returns a nested object keyed by day
  const [eventsByDay, setEventsByDay] = useState<any>(() => {
    // initialize with a fresh simulation run (ignore any saved hngrDb in localStorage)
    return simulateGame(data);
  });

  const [skipShuffleConfirm, setSkipShuffleConfirm] = useState<boolean>(() => {
    try {
      return (
        typeof window !== "undefined" &&
        localStorage.getItem("skipShuffleConfirm") === "1"
      );
    } catch (e) {
      return false;
    }
  });

  const [dontRemindAgain, setDontRemindAgain] = useState(false);

  useEffect(() => {
    // keep localStorage in sync whenever eventsByDay changes
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("events", JSON.stringify(eventsByDay));
      }
    } catch (e) {
      // noop
    }
  }, [eventsByDay]);

  const generateShuffled = (db: HngrDB) => {
    // run a fresh simulation (simulateGame uses a deep-cloned db internally)
    const fresh = simulateGame(db);
    const newByDay: Record<string, any[]> = {};
    for (const [day, events] of Object.entries(fresh)) {
      newByDay[day] = shuffleArray(events as any[]);
    }
    return newByDay;
  };

  const eraseAllData = () => {
    try {
      // this follows the pattern you showed earlier; erase your app DB key
      localStorage.removeItem("hngrDb");
      // also clear events and preferences to be safe
      localStorage.removeItem("events");
      localStorage.removeItem("skipShuffleConfirm");
    } catch (e) {}
    // do not reset in-memory state here
  };

  const doShuffle = (alsoRememberDontRemind = dontRemindAgain) => {
    if (alsoRememberDontRemind) {
      try {
        localStorage.setItem("skipShuffleConfirm", "1");
        setSkipShuffleConfirm(true);
      } catch (e) {}
    }

    // Deep clone data and reset tributes' health and alive status
    const clonedData: HngrDB = JSON.parse(JSON.stringify(data));
    for (const tributeId in clonedData.tributes) {
      const tribute = clonedData.tributes[tributeId];
      tribute.health = { mental: 100, physical: 100 };
      tribute.alive = true;
    }

    const newEvents = generateShuffled(clonedData);

    try {
      const hngrDbString = localStorage.getItem("hngrDb");
      const hngrDb = hngrDbString ? JSON.parse(hngrDbString) : { ...data };
      hngrDb.events = newEvents;
      localStorage.setItem("hngrDb", JSON.stringify(hngrDb));
    } catch (e) {}

    setEventsByDay(newEvents);
  };

  useEffect(() => {
    // on first render, shuffle events to populate new events
    doShuffle(skipShuffleConfirm || dontRemindAgain);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col text-center p-4 gap-4">
      {/* shuffle button with confirmation dialog */}
      {skipShuffleConfirm || dontRemindAgain ? (
        <Button onClick={() => doShuffle()}>
          <Shuffle /> shuffle
        </Button>
      ) : (
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Shuffle /> shuffle
            </Button>
          </DialogTrigger>

          <DialogContent className="flex flex-col content-center text-center justify-center items-center gap-4">
            <DialogHeader className="flex flex-col text-center content-center justify-center items-center">
              <DialogTitle>shuffle events?</DialogTitle>
              <DialogDescription className="text-center">
                this will clear your current stored events and replace them with a
                newly shuffled run.
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm flex flex-row gap-3 justify-center">
              <Checkbox
                id="dont-remind-again"
                checked={dontRemindAgain}
                onCheckedChange={(checked) =>
                  setDontRemindAgain(checked === true)
                }
              />
              <Label htmlFor="dont-remind-again" className="select-none">
                don't remind me again
              </Label>
            </div>
            <div className="flex gap-2 items-center">
              <DialogClose asChild>
                <Button
                  variant="destructive"
                  onClick={() => {
                    doShuffle();
                  }}
                >
                  <Shuffle /> shuffle now
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="secondary" className="cursor-pointer">
                  cancel
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* timeline */}
      {Object.entries(eventsByDay).map(([day, events]) => (
        <div key={`day-${day}`} className="flex flex-col gap-4">
          <h2 className={`text-3xl font-bold mb-2 ${gupter.className}`}>
            day {day}
          </h2>

          {events.map((event: any, idx: number) => (
            <div key={idx} className="flex flex-col items-center gap-2">
              {/* tribute avatars */}
              <div className="flex flex-wrap justify-center gap-2">
                {Object.values(event.roles).map((tributeId: string) => {
                  const tribute: Tribute | undefined = data.tributes[tributeId];
                  if (!tribute) return null;
                  return (
                    <Avatar
                      key={tribute.id}
                      className="flex flex-col w-20 h-20 items-center"
                    >
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
                {event.description.map((part: any, i: number) => {
                  if (typeof part === "string") return part;
                  const tribute = data.tributes[event.roles[part.role]];
                  if (!tribute) return null;
                  const [first, ...rest] = part.prop.split(".");
                  let value: any = (tribute as any)[first];
                  for (const key of rest) value = value?.[key];
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
