'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { NominationCard } from '@/components/nominations/nomination-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getReceivedNominations,
  getSentNominations,
  acceptNomination,
  rejectNomination,
  deleteNomination,
  voteOnNomination,
  getNominationVoteStatus,
  getNominationStats,
} from '@/lib/supabase/services/nominations';
import { syncUser } from '@/lib/supabase/services/users';
import type { NominationWithDetails } from '@/lib/supabase/types';
import { useRouter } from 'next/navigation';
import { Plus, Inbox, Send } from 'lucide-react';

export default function NominationsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [receivedNominations, setReceivedNominations] = useState<NominationWithDetails[]>([]);
  const [sentNominations, setSentNominations] = useState<NominationWithDetails[]>([]);
  const [stats, setStats] = useState({ sent: 0, received: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [voteStatuses, setVoteStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isLoaded && user) {
      loadData();
    }
  }, [isLoaded, user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Sync user with Supabase
      await syncUser(user);

      // Load nominations
      const [received, sent, statsData] = await Promise.all([
        getReceivedNominations(user.id),
        getSentNominations(user.id),
        getNominationStats(user.id),
      ]);

      setReceivedNominations(received);
      setSentNominations(sent);
      setStats(statsData);

      // Load vote statuses for received nominations
      const statuses: Record<string, boolean> = {};
      await Promise.all(
        received.map(async (nom) => {
          statuses[nom.id] = await getNominationVoteStatus(nom.id, user.id);
        })
      );
      setVoteStatuses(statuses);
    } catch (error) {
      console.error('Failed to load nominations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id: string) => {
    if (!user) return;
    await acceptNomination(id, user.id);
    await loadData();
  };

  const handleReject = async (id: string) => {
    if (!user) return;
    await rejectNomination(id, user.id);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    await deleteNomination(id, user.id);
    await loadData();
  };

  const handleVote = async (id: string) => {
    if (!user) return;
    await voteOnNomination(id, user.id);
    setVoteStatuses((prev) => ({ ...prev, [id]: !prev[id] }));
    await loadData();
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading nominations...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Please sign in to view nominations</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nominations</h1>
          <p className="text-muted-foreground">
            Manage tribute nominations from your friends
          </p>
        </div>
        <Button onClick={() => router.push('/nominate')}>
          <Plus className="mr-2 h-4 w-4" />
          New Nomination
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold">{stats.pending}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Received</p>
          <p className="text-2xl font-bold">{stats.received}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Sent</p>
          <p className="text-2xl font-bold">{stats.sent}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">
            <Inbox className="mr-2 h-4 w-4" />
            Received ({receivedNominations.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="mr-2 h-4 w-4" />
            Sent ({sentNominations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4">
          {receivedNominations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Inbox className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No nominations yet</h3>
              <p className="text-sm text-muted-foreground">
                When your friends nominate tributes for you, they'll appear here
              </p>
            </div>
          ) : (
            receivedNominations.map((nomination) => (
              <NominationCard
                key={nomination.id}
                nomination={nomination}
                type="received"
                onAccept={handleAccept}
                onReject={handleReject}
                onVote={handleVote}
                hasVoted={voteStatuses[nomination.id]}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sentNominations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Send className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No nominations sent</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Nominate tributes to appear in your friends' games
              </p>
              <Button onClick={() => router.push('/nominate')}>
                <Plus className="mr-2 h-4 w-4" />
                Create Nomination
              </Button>
            </div>
          ) : (
            sentNominations.map((nomination) => (
              <NominationCard
                key={nomination.id}
                nomination={nomination}
                type="sent"
                onDelete={handleDelete}
                onVote={handleVote}
                hasVoted={voteStatuses[nomination.id]}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
