import { loadGame } from "@/lib/simulation";
import { HngrDB } from "@/lib/setup";

type Props = {
  db: HngrDB;
};

export default function EventTimeline({ db }: Props) {
  const eventsByDay = loadGame(db);

  return (
    <div>
      {Object.entries(eventsByDay).map(([day, events]) => (
        <div key={day}>
          <h2>Day {day}</h2>
          {events.map((event, idx) => (
            <p key={idx}>{event.description}</p>
          ))}
        </div>
      ))}
    </div>
  );
}