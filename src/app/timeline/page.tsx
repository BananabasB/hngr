// src/app/timeline/page.tsx
"use client"
import { useState, useEffect } from 'react';
import EventTimeline from "@/components/events";
import BasicTest from "@/testing/BasicTest";
import { useAuth } from "@/lib/auth";
import { applyUserTemplates } from "@/lib/events";
import type { SimulationEventTemplate } from "@/lib/supabase/types";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppState } from "@/lib/state-context-refactored";

// Define the type for your database structure, e.g., HngrDB
// You can import this type if it's defined elsewhere, otherwise use 'any' temporarily.
type HngrDB = any; 

export default function TimelinePage() {
  const { user, loading: authLoading, isPlus } = useAuth();
  const { db, currentSeason } = useAppState();
  const [customEventsLoaded, setCustomEventsLoaded] = useState(false);
  
  // Don't wait for custom events if user doesn't have hngr+
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

  // 3. Render a loading state if the database hasn't been loaded yet or custom events are still loading.
  // The server renders this simple <div>.
  if (db === null || !customEventsLoaded) {
    return (
      <div className="p-4 flex justify-center">
        <LoadingState 
          text={authLoading ? 'checking membership...' : customEventsLoaded ? 'loading game data...' : 'loading custom events...'}
        />
      </div>
    );
  }

  // 4. Render the full component once the client data is available.
  return (
    <div>
      {currentSeason && (
        <div className="mb-4 p-4 bg-gray-100 rounded text-sm">
          <div>Showing timeline for: <strong>{currentSeason.name}</strong></div>
          <div>Season ID: {currentSeason.id}</div>
        </div>
      )}
      <EventTimeline data={db} />
    </div>
  );
}