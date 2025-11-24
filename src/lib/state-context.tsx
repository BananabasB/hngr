"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { HngrDB } from './setup';
import { setupDatabase } from './setup';
import { updateReferralName } from './localStorage';

interface StateContextType {
  db: HngrDB | null;
  setDb: (db: HngrDB) => void;
  updateReferralName: (value: "tributes" | "volunteers" | "nominees") => void;
}

const StateContext = createContext<StateContextType | null>(null);

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [db, setDbState] = useState<HngrDB | null>(null);

  useEffect(() => {
    // Initialize database on mount
    const database = setupDatabase();
    setDbState(database);
  }, []);

  const setDb = (newDb: HngrDB) => {
    setDbState(newDb);
  };

  const handleUpdateReferralName = (value: "tributes" | "volunteers" | "nominees") => {
    if (!db) return;

    const updated = updateReferralName(db, value);
    setDbState(updated);
  };

  return (
    <StateContext.Provider value={{
      db,
      setDb,
      updateReferralName: handleUpdateReferralName,
    }}>
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useAppState must be used within a StateProvider');
  }
  return context;
}
