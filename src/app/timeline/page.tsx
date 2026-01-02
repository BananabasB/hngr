// src/app/timeline/page.tsx
"use client"
import { useState, useEffect } from 'react'; // <--- Import hooks
import { load } from "@/lib/localStorage";
import EventTimeline from "@/components/events";
import BasicTest from "@/testing/BasicTest";
import { useAuth } from "@/lib/auth";
import { applyUserTemplates } from "@/lib/events";
import type { SimulationEventTemplate } from "@/lib/supabase/types";

// Define the type for your database structure, e.g., HngrDB
// You can import this type if it's defined elsewhere, otherwise use 'any' temporarily.
type HngrDB = any; 

export default function TimelinePage() {
  const { user, loading: authLoading, isPlus } = useAuth();
  // 1. Initialize the database state to null/undefined. 
  // This is the value the server will use for its initial render.
  const [db, setDb] = useState<HngrDB | null>(null);
  const [customEventsLoaded, setCustomEventsLoaded] = useState(false);

  // Load custom events when user is available and has hngr+
  useEffect(() => {
    if (authLoading || !user || !isPlus) {
      setCustomEventsLoaded(true); // Skip custom events loading
      return;
    }

    const loadCustomEvents = async () => {
      try {
        const res = await fetch("/api/simulation-events?includeMine=true", {
          headers: {
            Authorization: user.id ? `Bearer ${user.id}` : "",
          },
        });
        
        if (res.ok) {
          const data = await res.json();
          await applyUserTemplates(data.data || [], user.id);
        }
      } catch (error) {
        console.error('Failed to load custom events:', error);
      } finally {
        setCustomEventsLoaded(true);
      }
    };

    loadCustomEvents();
  }, [authLoading, user, isPlus]);

  // 2. Use useEffect to run the client-side-only load() function on mount.
  useEffect(() => {
    // This code only runs in the browser, after hydration.
    const clientDb = load("hngr-db");
    setDb(clientDb);
  }, []); // The empty dependency array ensures this runs only once on mount.

  // 3. Render a loading state if the database hasn't been loaded yet or custom events are still loading.
  // The server renders this simple <div>.
  if (db === null || !customEventsLoaded) {
    return (
      <div className="p-4 text-center">
        {authLoading ? 'checking membership...' : customEventsLoaded ? 'loading game data...' : 'loading custom events...'}
      </div>
    );
  }

  // 4. Render the full component once the client data is available.
  return (
    <div>
      <EventTimeline data={db} />
    </div>
  );
}