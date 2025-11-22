'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { createNomination } from '@/lib/supabase/services/nominations';
import { syncUser } from '@/lib/supabase/services/users';
import { searchUsers } from '@/lib/supabase/services/users';
import type { User } from '@/lib/supabase/types';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Search, User as UserIcon } from 'lucide-react';

export default function NominatePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);
  
  // Tribute info fields
  const [tributeName, setTributeName] = useState('');
  const [tributePronouns, setTributePronouns] = useState({
    subject: 'they',
    object: 'them',
    possessive: 'their',
    reflexive: 'themselves',
  });
  const [tributeImageUrl, setTributeImageUrl] = useState('');
  const [tributeBio, setTributeBio] = useState('');
  const [message, setMessage] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (isLoaded && user) {
      syncUser(user);
    }
  }, [isLoaded, user]);

  const searchRecipients = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await searchUsers(query, 20);
      // Filter out current user
      setSearchResults(results.filter((u) => u.id !== user?.id));
    } catch (error) {
      console.error('Failed to search users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchRecipients(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSubmit = async () => {
    if (!user || !selectedRecipient || !tributeName.trim()) return;

    setSubmitting(true);
    try {
      await createNomination(user.id, {
        recipient_id: selectedRecipient.id,
        tribute_name: tributeName.trim(),
        tribute_pronouns: tributePronouns,
        tribute_image_url: tributeImageUrl.trim() || undefined,
        tribute_bio: tributeBio.trim() || undefined,
        message: message.trim() || undefined,
      });

      router.push('/nominations');
    } catch (error) {
      console.error('Failed to create nomination:', error);
      alert('Failed to create nomination. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>please sign in to nominate tributes</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/nominations')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">nominate a tribute</h1>
          <p className="text-muted-foreground">
            create a nomination with tribute information
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

      {/* Step 1: Search and Select Recipient */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>select recipient</CardTitle>
            <CardDescription>
              find the person you want to nominate a tribute for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="search by username or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {loading && (
              <p className="text-center text-sm text-muted-foreground">searching...</p>
            )}

            {!loading && searchQuery && searchResults.length === 0 && (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <UserIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">no users found</p>
              </div>
            )}

            <div className="space-y-2">
              {searchResults.map((recipient) => (
                <button
                  key={recipient.id}
                  onClick={() => {
                    setSelectedRecipient(recipient);
                    setStep(2);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
                >
                  <Avatar>
                    <AvatarImage src={recipient.avatar_url || undefined} />
                    <AvatarFallback>
                      {recipient.display_name?.[0] || recipient.username?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">
                      {recipient.display_name || recipient.username || 'unknown'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{recipient.username || 'unknown'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Enter Tribute Information */}
      {step === 2 && selectedRecipient && (
        <Card>
          <CardHeader>
            <CardTitle>tribute information</CardTitle>
            <CardDescription>
              enter details about the tribute you're nominating for @{selectedRecipient.username}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tribute-name">tribute name *</Label>
              <Input
                id="tribute-name"
                placeholder="enter tribute name"
                value={tributeName}
                onChange={(e) => setTributeName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pronoun-subject">subject pronoun</Label>
                <Input
                  id="pronoun-subject"
                  placeholder="they"
                  value={tributePronouns.subject}
                  onChange={(e) =>
                    setTributePronouns({ ...tributePronouns, subject: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pronoun-object">object pronoun</Label>
                <Input
                  id="pronoun-object"
                  placeholder="them"
                  value={tributePronouns.object}
                  onChange={(e) =>
                    setTributePronouns({ ...tributePronouns, object: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pronoun-possessive">possessive pronoun</Label>
                <Input
                  id="pronoun-possessive"
                  placeholder="their"
                  value={tributePronouns.possessive}
                  onChange={(e) =>
                    setTributePronouns({ ...tributePronouns, possessive: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pronoun-reflexive">reflexive pronoun</Label>
                <Input
                  id="pronoun-reflexive"
                  placeholder="themselves"
                  value={tributePronouns.reflexive}
                  onChange={(e) =>
                    setTributePronouns({ ...tributePronouns, reflexive: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tribute-image">image url (optional)</Label>
              <Input
                id="tribute-image"
                placeholder="https://example.com/image.jpg"
                value={tributeImageUrl}
                onChange={(e) => setTributeImageUrl(e.target.value)}
                type="url"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tribute-bio">bio (optional)</Label>
              <Textarea
                id="tribute-bio"
                placeholder="a brief description of the tribute"
                value={tributeBio}
                onChange={(e) => setTributeBio(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep(1);
                  setSelectedRecipient(null);
                }}
                className="flex-1"
              >
                back
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!tributeName.trim()}
                className="flex-1"
              >
                next
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Add Message and Submit */}
      {step === 3 && selectedRecipient && (
        <Card>
          <CardHeader>
            <CardTitle>add a message (optional)</CardTitle>
            <CardDescription>
              nominating {tributeName} for @{selectedRecipient.username}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">message</Label>
              <Textarea
                id="message"
                placeholder="why are you nominating this tribute?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1"
              >
                back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !tributeName.trim()}
                className="flex-1"
              >
                <Send className="mr-2 h-4 w-4" />
                {submitting ? 'sending...' : 'send nomination'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
