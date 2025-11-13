// src/app/timeline/page.tsx
"use client"
import { useState, useEffect } from 'react'; // <--- Import hooks
import { load } from "@/lib/localStorage";
import EventTimeline from "@/components/events";
import BasicTest from "@/testing/BasicTest";

// Define the type for your database structure, e.g., HngrDB
// You can import this type if it's defined elsewhere, otherwise use 'any' temporarily.
type HngrDB = any; 

export default function TimelinePage() {
  // 1. Initialize the database state to null/undefined. 
  // This is the value the server will use for its initial render.
  const [db, setDb] = useState<HngrDB | null>(null);

  // 2. Use useEffect to run the client-side-only load() function on mount.
  useEffect(() => {
    // This code only runs in the browser, after hydration.
    const clientDb = load("hngr-db");
    setDb(clientDb);
  }, []); // The empty dependency array ensures this runs only once on mount.

  // 3. Render a loading state if the database hasn't been loaded yet.
  // The server renders this simple <div>.
  if (db === null) {
    return (
      <div className="p-4 text-center">loading game data...</div>
    );
  }

  // 4. Render the full component once the client data is available.
  return (
    <div>
      <EventTimeline data={db} />
    </div>
  );
}