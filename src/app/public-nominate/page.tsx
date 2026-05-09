"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MentalHealthResources } from "@/components/mental-health-resources";
import type { ModerationResult } from "@/lib/moderation";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { searchUsers } from "@/lib/supabase/services/users";
import type { User } from "@/lib/supabase/types";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Search, User as UserIcon, Upload, HatGlasses } from "lucide-react";

export default function PublicNominatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<User | null>(null);

  // Tribute info fields
  const [tributeName, setTributeName] = useState("");
  const [tributePronouns, setTributePronouns] = useState({
    subject: "they",
    object: "them",
    possessive: "their",
    reflexive: "themselves",
  });
  const [tributeBio, setTributeBio] = useState("");
  const [tributeIncome, setTributeIncome] = useState<string>("");
  const [message, setMessage] = useState("");
  const [draftImage, setDraftImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [moderationResult, setModerationResult] = useState<(ModerationResult & { mentalHealthGuidance?: any }) | null>(null);

  const searchRecipients = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const results = await searchUsers(query, 20);
      setSearchResults(results);
    } catch (error) {
      console.error("Failed to search users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const recipientId = searchParams.get('recipient');
    if (!recipientId) return;

    const loadRecipient = async () => {
      try {
        const results = await searchUsers(recipientId, 20);
        const exactMatch = results.find((user) => user.id === recipientId);
        if (exactMatch) {
          setSelectedRecipient(exactMatch);
          setSearchQuery(exactMatch.username || exactMatch.display_name || '');
          setSearchResults([exactMatch]);
          setStep(2);
        }
      } catch (error) {
        console.error('Failed to load recipient from nomination link:', error);
      }
    };

    loadRecipient();
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchRecipients(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSubmit = async () => {
    if (!selectedRecipient || !tributeName.trim()) return;

    setSubmitting(true);
    setError(null);
    setModerationResult(null);
    try {
      const response = await fetch('/api/nominations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Anonymous nomination, no userId
          nominationData: {
            recipient_id: selectedRecipient.id,
            tribute_name: tributeName.trim(),
            tribute_pronouns: tributePronouns,
            tribute_image_url: draftImage || undefined,
            tribute_bio: tributeBio.trim() || undefined,
            message: message.trim() || undefined,
            income: tributeIncome ? parseInt(tributeIncome) : undefined,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.moderationResult) {
          setModerationResult(data.moderationResult);
          setError(data.error);
        } else {
          setError(data.error || 'Failed to create nomination');
        }
        return;
      }

      setStep(4); // Success step
    } catch (error) {
      console.error("Failed to create nomination:", error);
      setError("Failed to create nomination. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Branding Header */}
      <header className="border-b py-4 px-6 flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-primary rounded p-1">
            <HatGlasses className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tighter text-foreground">hngr</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/waitlist")}>
          join waitlist
        </Button>
      </header>

      <div className="container mx-auto max-w-2xl space-y-6 p-6 pt-12 flex-1">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight">public nomination</h1>
          <p className="text-muted-foreground text-lg">
            nominate a tribute for a friend or your favorite creator.
          </p>
        </div>

      {/* Progress */}
      {step < 4 && (
        <div className="flex items-center gap-2">
          <div className={`h-2 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-2 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          <div className={`h-2 flex-1 rounded-full ${step >= 3 ? "bg-primary" : "bg-muted"}`} />
        </div>
      )}

      {/* Step 1: Search and Select Recipient */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>who is this for?</CardTitle>
            <CardDescription>
              search for the user you want to nominate a tribute for
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

            {loading && <p className="text-center text-sm text-muted-foreground">searching...</p>}

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
                    <AvatarFallback>{recipient.username?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">{recipient.display_name || recipient.username || "unknown"}</p>
                    <p className="text-sm text-muted-foreground">@{recipient.username || "unknown"}</p>
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
              nominating a tribute for @{selectedRecipient.username}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
              <div className="flex flex-col w-full items-center gap-3">
                <Label htmlFor="tribute-image" className="sr-only">Picture</Label>
                <div onClick={() => document.getElementById("tribute-image")?.click()} className="cursor-pointer relative group">
                  <Avatar className="w-32 h-32 rounded-md">
                    <AvatarImage src={draftImage || undefined} className="object-cover rounded-md w-full h-full" />
                    <AvatarFallback className="w-full p-3 text-center h-full flex items-center justify-center text-sm hover:bg-gray-100 transition rounded-md">
                      <HatGlasses className="transition-opacity hover:opacity-0" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/50 flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                    <Upload className="stroke-white" />
                    <span className="text-white text-sm text-center px-2">upload photo</span>
                  </div>
                </div>
                <Input
                  id="tribute-image"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement("canvas");
                        const maxDim = 200;
                        let width = img.width;
                        let height = img.height;
                        if (width > height) {
                          if (width > maxDim) {
                            height = Math.round((height * maxDim) / width);
                            width = maxDim;
                          }
                        } else {
                          if (height > maxDim) {
                            width = Math.round((width * maxDim) / height);
                            height = maxDim;
                          }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext("2d");
                        if (ctx) {
                          ctx.drawImage(img, 0, 0, width, height);
                          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                          setDraftImage(dataUrl);
                        }
                      };
                      img.src = ev.target?.result as string;
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
              <Label htmlFor="tribute-name">tribute name *</Label>
              <Input
                id="tribute-name"
                placeholder="enter tribute name"
                value={tributeName}
                onChange={(e) => setTributeName(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="pronoun-subject">subject pronoun</Label>
                <Input
                  id="pronoun-subject"
                  placeholder="they"
                  value={tributePronouns.subject}
                  onChange={(e) => setTributePronouns({ ...tributePronouns, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pronoun-object">object pronoun</Label>
                <Input
                  id="pronoun-object"
                  placeholder="them"
                  value={tributePronouns.object}
                  onChange={(e) => setTributePronouns({ ...tributePronouns, object: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pronoun-possessive">possessive pronoun</Label>
                <Input
                  id="pronoun-possessive"
                  placeholder="their"
                  value={tributePronouns.possessive}
                  onChange={(e) => setTributePronouns({ ...tributePronouns, possessive: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pronoun-reflexive">reflexive pronoun</Label>
                <Input
                  id="pronoun-reflexive"
                  placeholder="themselves"
                  value={tributePronouns.reflexive}
                  onChange={(e) => setTributePronouns({ ...tributePronouns, reflexive: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tribute-bio">bio (optional)</Label>
              <Textarea
                id="tribute-bio"
                placeholder="a brief description"
                value={tributeBio}
                onChange={(e) => setTributeBio(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep(1); setSelectedRecipient(null); }} className="flex-1">back</Button>
              <Button onClick={() => setStep(3)} disabled={!tributeName.trim()} className="flex-1">next</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Message and Submit */}
      {step === 3 && selectedRecipient && (
        <Card>
          <CardHeader>
            <CardTitle>add a message (optional)</CardTitle>
            <CardDescription>
              nominating {tributeName} for @{selectedRecipient.username}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertDescription>{error.split('\n')[0]}</AlertDescription>
                </Alert>
                {moderationResult?.mentalHealthGuidance && (
                  <MentalHealthResources guidance={moderationResult.mentalHealthGuidance} dialog />
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message">message</Label>
              <Textarea
                id="message"
                placeholder="why this tribute?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">back</Button>
              <Button onClick={handleSubmit} disabled={submitting || !tributeName.trim()} className="flex-1">
                <Send className="mr-2 h-4 w-4" />
                {submitting ? "sending..." : "send nomination"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <Card className="text-center py-12">
          <CardContent className="space-y-6">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Send className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">nomination sent!</CardTitle>
              <CardDescription>
                your nomination for {tributeName} has been sent to @{selectedRecipient?.username}.
              </CardDescription>
            </div>
            <div className="pt-4 space-y-3">
              <Button onClick={() => router.push("/")} className="w-full">back home</Button>
              <Button variant="outline" onClick={() => { setStep(1); setSelectedRecipient(null); setTributeName(""); }} className="w-full">nominate another</Button>
            </div>
            <div className="pt-6 border-t">
              <p className="text-sm text-muted-foreground">want to track your nominations and see the results? join our private beta!</p>
              <Button variant="link" onClick={() => router.push("/waitlist")}>join waitlist</Button>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
