'use client'

import { useEffect, useState } from 'react'
import { simulateGame } from '@/lib/simulation'
import { HngrDB } from '@/lib/setup'

type Props = { data: HngrDB }

export default function BasicTest({ data }: Props) {
  const [gameEvents, setGameEvents] = useState<any[]>([])

  useEffect(() => {
    setGameEvents(simulateGame(data))
  }, [data])

  return <p>{JSON.stringify(gameEvents)}</p>
}