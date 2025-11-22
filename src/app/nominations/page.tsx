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
  reportNomination,
} from '@/lib/supabase/services/nominations';
import { syncUser } from '@/lib/supabase/services/users';
import type { NominationWithDetails } from '@/lib/supabase/types';
import { useRouter } from 'next/navigation';
import { Plus, Inbox, Send } from 'lucide-react';
import { NotAuthenticated } from '@/components/not-authenticated';

export default function NominationsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [receivedNominations, setReceivedNominations] = useState<NominationWithDetails[]>([]);
  const [sentNominations, setSentNominations] = useState<NominationWithDetails[]>([]);
  const [stats, setStats] = useState({ sent: 0, received: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [voteStatuses, setVoteStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        loadData();
      } else {
        // User is not authenticated, stop loading
        setLoading(false);
      }
    }
  }, [isLoaded, user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('Starting to load nominations for user:', user.id);
      console.log('User object:', {
        id: user.id,
        emailAddresses: user.emailAddresses?.length,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName
      });

      // Sync user with Supabase
      console.log('Syncing user...');
      await syncUser(user);
      console.log('User synced successfully');

      // Load nominations with individual error handling
      console.log('Loading nominations...');
      let received: NominationWithDetails[] = [];
      let sent: NominationWithDetails[] = [];
      let statsData: { sent: number; received: number; pending: number };

      try {
        received = await getReceivedNominations(user.id);
        console.log('Received nominations loaded:', received.length);
      } catch (error) {
        console.error('Failed to load received nominations:', error);
        // If it's a database connectivity error, re-throw
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Database error')) {
          throw new Error(`Failed to load received nominations: ${errorMessage}`);
        }
        // If it's a report status error, continue with empty array
        // The nominations themselves might be loadable
        console.warn('Continuing with empty nominations due to report status error');
        received = [];
      }

      try {
        sent = await getSentNominations(user.id);
        console.log('Sent nominations loaded:', sent.length);
      } catch (error) {
        console.error('Failed to load sent nominations:', error);
        // If it's a database connectivity error, re-throw
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Database error')) {
          throw new Error(`Failed to load sent nominations: ${errorMessage}`);
        }
        // If it's a report status error, continue with empty array
        console.warn('Continuing with empty sent nominations due to report status error');
        sent = [];
      }

      try {
        statsData = await getNominationStats(user.id);
        console.log('Stats loaded:', statsData);
      } catch (error) {
        console.error('Failed to load nomination stats:', error);
        throw new Error(`Failed to load nomination stats: ${error}`);
      }

      setReceivedNominations(received);
      setSentNominations(sent);
      setStats(statsData);

      // Load vote statuses for received nominations
      console.log('Loading vote statuses...');
      const statuses: Record<string, boolean> = {};
      await Promise.all(
        received.map(async (nom) => {
          try {
            statuses[nom.id] = await getNominationVoteStatus(nom.id, user.id);
          } catch (error) {
            console.error(`Failed to load vote status for nomination ${nom.id}:`, error);
            statuses[nom.id] = false; // Default to false on error
          }
        })
      );
      setVoteStatuses(statuses);
      console.log('All data loaded successfully');
    } catch (error) {
      console.error('Failed to load nominations:', error);
      // Log more details for debugging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else {
        console.error('Unknown error type:', typeof error, JSON.stringify(error));
      }
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

  const handleReport = async (id: string, reason: string, details?: string) => {
    if (!user) return;
    await reportNomination(id, user.id, reason as any, details);
    await loadData();
  };

  if (!isLoaded || (user && loading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>loading nominations...</p>
      </div>
    );
  }

  if (!user) {
    return <NotAuthenticated description="please sign in to view and manage your nominations" />;
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">nominations</h1>
          <p className="text-muted-foreground">
            manage tribute nominations from your friends
          </p>
        </div>
        <Button onClick={() => router.push('/nominate')}>
          <Plus className="mr-2 h-4 w-4" />
          new nomination
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">pending</p>
          <p className="text-2xl font-bold">{stats.pending}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">received</p>
          <p className="text-2xl font-bold">{stats.received}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">sent</p>
          <p className="text-2xl font-bold">{stats.sent}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">
            <Inbox className="mr-2 h-4 w-4" />
            received ({receivedNominations.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            <Send className="mr-2 h-4 w-4" />
            sent ({sentNominations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-4">
          {receivedNominations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Inbox className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">no nominations yet</h3>
              <p className="text-sm text-muted-foreground">
                when your friends nominate tributes for you, they'll appear here
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
                onReport={handleReport}
                hasVoted={voteStatuses[nomination.id]}
                userReported={nomination.user_reported}
                reportCount={nomination.report_count}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sentNominations.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Send className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">no nominations sent</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                nominate tributes to appear in your friends' games
              </p>
              <Button onClick={() => router.push('/nominate')}>
                <Plus className="mr-2 h-4 w-4" />
                create nomination
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
                onReport={handleReport}
                hasVoted={voteStatuses[nomination.id]}
                userReported={nomination.user_reported}
                reportCount={nomination.report_count}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
