'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getFriends } from '@/lib/supabase/services/friends';
import { getFriendTributes } from '@/lib/supabase/services/tributes';
import { createNomination } from '@/lib/supabase/services/nominations';
import { syncUser } from '@/lib/supabase/services/users';
import type { FriendshipWithUser, Tribute } from '@/lib/supabase/types';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Users, User as UserIcon } from 'lucide-react';

export default function NominatePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendshipWithUser[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [friendTributes, setFriendTributes] = useState<Tribute[]>([]);
  const [selectedTribute, setSelectedTribute] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isLoaded && user) {
      loadData();
    }
  }, [isLoaded, user]);

  useEffect(() => {
    if (selectedFriend) {
      loadFriendTributes(selectedFriend);
    }
  }, [selectedFriend]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await syncUser(user);
      const friendsData = await getFriends(user.id);
      setFriends(friendsData);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriendTributes = async (friendId: string) => {
    try {
      const tributes = await getFriendTributes(friendId);
      setFriendTributes(tributes);
    } catch (error) {
      console.error('Failed to load tributes:', error);
    }
  };

  const handleSubmit = async () => {
    if (!user || !selectedFriend || !selectedTribute) return;

    setSubmitting(true);
    try {
      await createNomination(user.id, {
        recipient_id: selectedFriend,
        tribute_id: selectedTribute,
        message: message || undefined,
      });

      router.push('/nominations');
    } catch (error) {
      console.error('Failed to create nomination:', error);
      alert('Failed to create nomination. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Please sign in to nominate tributes</p>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="container mx-auto max-w-2xl space-y-6 p-6">
        <Button variant="ghost" onClick={() => router.push('/nominations')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No friends yet</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Add friends to start nominating tributes for their games
          </p>
          <Button onClick={() => router.push('/friends')}>
            <Users className="mr-2 h-4 w-4" />
            Find Friends
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/nominations')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Nominate a Tribute</h1>
          <p className="text-muted-foreground">
            Choose a friend and one of their tributes to nominate
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div
          className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`}
        />
        <div
          className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}
        />
        <div
          className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`}
        />
      </div>

      {/* Step 1: Select Friend */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select a Friend</CardTitle>
            <CardDescription>
              Who would you like to nominate a tribute for?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {friends.map((friendship) => (
              <button
                key={friendship.id}
                onClick={() => {
                  setSelectedFriend(friendship.friend_id);
                  setStep(2);
                }}
                className="flex w-full items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <Avatar>
                  <AvatarImage src={friendship.friend?.avatar_url || undefined} />
                  <AvatarFallback>
                    {friendship.friend?.display_name?.[0] ||
                      friendship.friend?.username?.[0] ||
                      '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-semibold">
                    {friendship.friend?.display_name || friendship.friend?.username}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{friendship.friend?.username || 'unknown'}
                  </p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Tribute */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select a Tribute</CardTitle>
            <CardDescription>
              Choose one of{' '}
              {friends.find((f) => f.friend_id === selectedFriend)?.friend
                ?.display_name || "your friend's"}{' '}
              tributes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {friendTributes.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <UserIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  This friend has no tributes yet
                </p>
              </div>
            ) : (
              friendTributes.map((tribute) => (
                <button
                  key={tribute.id}
                  onClick={() => {
                    setSelectedTribute(tribute.id);
                    setStep(3);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
                >
                  {tribute.image_url && (
                    <Avatar>
                      <AvatarImage src={tribute.image_url} />
                      <AvatarFallback>{tribute.name[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-semibold">{tribute.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {tribute.pronouns.subject}/{tribute.pronouns.object}
                    </p>
                  </div>
                </button>
              ))
            )}
            <Button
              variant="outline"
              onClick={() => {
                setStep(1);
                setSelectedFriend(null);
                setSelectedTribute(null);
              }}
              className="mt-4 w-full"
            >
              Choose Different Friend
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Add Message and Submit */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Add a Message (Optional)</CardTitle>
            <CardDescription>
              Include a message with your nomination
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Why are you nominating this tribute?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(2);
                  setSelectedTribute(null);
                }}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1"
              >
                <Send className="mr-2 h-4 w-4" />
                {submitting ? 'Sending...' : 'Send Nomination'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
