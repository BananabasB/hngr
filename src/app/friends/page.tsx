'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarWithPlus } from '@/components/ui/avatar-with-plus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingState } from '@/components/ui/loading-state';
import {
  getFriends,
  getPendingFriendRequests,
  getSentFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
} from '@/lib/supabase/services/friends';
import { syncUser } from '@/lib/supabase/services/users';
import type { FriendshipWithUser } from '@/lib/supabase/types';
import { Users, UserPlus, Check, X, Trash2 } from 'lucide-react';
import { NotAuthenticated } from '@/components/not-authenticated';

export default function FriendsPage() {
  const { user, isLoaded } = useUser();
  const [friends, setFriends] = useState<FriendshipWithUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendshipWithUser[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendshipWithUser[]>([]);
  const [friendIdentifier, setFriendIdentifier] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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
      await syncUser(user);
      const [friendsData, pendingData, sentData] = await Promise.all([
        getFriends(user.id),
        getPendingFriendRequests(user.id),
        getSentFriendRequests(user.id),
      ]);

      setFriends(friendsData);
      setPendingRequests(pendingData);
      setSentRequests(sentData);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !friendIdentifier.trim()) return;

    setSending(true);
    try {
      await sendFriendRequest(user.id, friendIdentifier.trim());
      setFriendIdentifier('');
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to send friend request');
    } finally {
      setSending(false);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    if (!user) return;
    try {
      await acceptFriendRequest(friendshipId, user.id);
      await loadData();
    } catch (error) {
      console.error('Failed to accept request:', error);
    }
  };

  const handleReject = async (friendshipId: string) => {
    if (!user) return;
    try {
      await rejectFriendRequest(friendshipId, user.id);
      await loadData();
    } catch (error) {
      console.error('Failed to reject request:', error);
    }
  };

  const handleRemove = async (friendId: string) => {
    if (!user) return;
    if (!confirm('Are you sure you want to remove this friend?')) return;

    try {
      await removeFriend(user.id, friendId);
      await loadData();
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  };

  if (!isLoaded || (user && loading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingState text="loading friends..." />
      </div>
    );
  }

  if (!user) {
    return <NotAuthenticated description="please sign in to view and manage your friends" />;
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">friends</h1>
        <p className="text-muted-foreground">manage your friend connections</p>
      </div>

      {/* Add Friend Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            add friend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendRequest} className="flex gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="friend">username or email</Label>
              <Input
                id="friend"
                placeholder="enter username or email"
                value={friendIdentifier}
                onChange={(e) => setFriendIdentifier(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={sending} className="self-end">
              <UserPlus className="mr-2 h-4 w-4" />
              {sending ? 'sending...' : 'send request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">friends</p>
          <p className="text-2xl font-bold">{friends.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">pending requests</p>
          <p className="text-2xl font-bold">{pendingRequests.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">sent requests</p>
          <p className="text-2xl font-bold">{sentRequests.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="friends" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends">
            <Users className="mr-2 h-4 w-4" />
            friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            <Check className="mr-2 h-4 w-4" />
            requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            <UserPlus className="mr-2 h-4 w-4" />
            sent ({sentRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-2">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Users className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">no friends yet</h3>
              <p className="text-sm text-muted-foreground">
                add friends to start nominating tributes
              </p>
            </div>
          ) : (
            friends.map((friendship) => (
              <div
                key={friendship.id}
                className="flex items-center gap-3 rounded-lg border p-4"
              >
                <AvatarWithPlus isPlus={friendship.friend?.is_plus || false}>
                  <AvatarImage src={friendship.friend?.avatar_url || undefined} />
                  <AvatarFallback>
                    {friendship.friend?.display_name?.[0] ||
                      friendship.friend?.username?.[0] ||
                      '?'}
                  </AvatarFallback>
                </AvatarWithPlus>
                <div className="flex-1">
                  <p className="font-semibold">
                    {friendship.friend?.display_name || friendship.friend?.username}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{friendship.friend?.username || 'unknown'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(friendship.friend_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-2">
          {pendingRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <Check className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">no pending requests</h3>
              <p className="text-sm text-muted-foreground">
                friend requests will appear here
              </p>
            </div>
          ) : (
            pendingRequests.map((friendship) => (
              <div
                key={friendship.id}
                className="flex items-center gap-3 rounded-lg border p-4"
              >
                <AvatarWithPlus isPlus={friendship.friend?.is_plus || false}>
                  <AvatarImage src={friendship.friend?.avatar_url || undefined} />
                  <AvatarFallback>
                    {friendship.friend?.display_name?.[0] ||
                      friendship.friend?.username?.[0] ||
                      '?'}
                  </AvatarFallback>
                </AvatarWithPlus>
                <div className="flex-1">
                  <p className="font-semibold">
                    {friendship.friend?.display_name || friendship.friend?.username}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{friendship.friend?.username || 'unknown'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(friendship.id)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReject(friendship.id)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-2">
          {sentRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
              <UserPlus className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">no sent requests</h3>
              <p className="text-sm text-muted-foreground">
                sent friend requests will appear here
              </p>
            </div>
          ) : (
            sentRequests.map((friendship) => (
              <div
                key={friendship.id}
                className="flex items-center gap-3 rounded-lg border p-4"
              >
                <AvatarWithPlus isPlus={friendship.friend?.is_plus || false}>
                  <AvatarImage src={friendship.friend?.avatar_url || undefined} />
                  <AvatarFallback>
                    {friendship.friend?.display_name?.[0] ||
                      friendship.friend?.username?.[0] ||
                      '?'}
                  </AvatarFallback>
                </AvatarWithPlus>
                <div className="flex-1">
                  <p className="font-semibold">
                    {friendship.friend?.display_name || friendship.friend?.username}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{friendship.friend?.username || 'unknown'} • Pending
                  </p>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
