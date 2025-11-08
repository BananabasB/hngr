// src/testing/BasicTest.tsx
'use client'

import { useEffect, useState } from 'react'
import { loadGame } from '@/lib/simulation'
import { HngrDB } from '@/lib/setup'

// You might also need to update this type to accept null/undefined
// if you are passing 'db' before it's loaded.
// type Props = { data: HngrDB | null } 
type Props = { data: HngrDB } 


export default function BasicTest({ data }: Props) {
  const [gameEvents, setGameEvents] = useState<Record<number, any[]>>({})

  useEffect(() => {
    // 🚨 SOLUTION: Exit early if data is not yet loaded 
    if (!data) {
      // You can return early, or set a default empty state if needed
      console.log("BasicTest: waiting for data to load...");
      return; 
    }
    
    // This only runs when the 'data' prop is valid
    setGameEvents(loadGame(data) ?? {})
  }, [data]) // Re-runs when data changes from null to the loaded HngrDB object

  return null;
}