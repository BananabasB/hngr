'use client'

import { useEffect, useState } from 'react'
import { loadGame } from '@/lib/simulation'
import { HngrDB } from '@/lib/setup'

type Props = { data: HngrDB }

export default function BasicTest({ data }: Props) {
  const [gameEvents, setGameEvents] = useState<Record<number, any[]>>({})

  useEffect(() => {
    setGameEvents(loadGame(data) ?? {})
  }, [data])

  return <p>{JSON.stringify(gameEvents)}</p>
}