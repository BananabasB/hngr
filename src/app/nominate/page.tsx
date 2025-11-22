"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
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
import { syncUser } from "@/lib/supabase/services/users";
import { searchUsers } from "@/lib/supabase/services/users";
import type { User } from "@/lib/supabase/types";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Search, User as UserIcon, Upload, HatGlasses } from "lucide-react";

export default function NominatePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

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
  const [tributeImageUrl, setTributeImageUrl] = useState("");
  const [tributeBio, setTributeBio] = useState("");
  const [tributeIncome, setTributeIncome] = useState<string>("");
  const [message, setMessage] = useState("");
  const [draftImage, setDraftImage] = useState<string | null>(tributeImageUrl || null)

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [moderationResult, setModerationResult] = useState<(ModerationResult & { mentalHealthGuidance?: any }) | null>(null);

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
      console.error("Failed to search users:", error);
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
    setError(null);
    setModerationResult(null);
    try {
      const response = await fetch('/api/nominations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
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
        // Handle moderation errors
        if (data.moderationResult) {
          setModerationResult(data.moderationResult);
          setError(data.error);
        } else {
          setError(data.error || 'Failed to create nomination');
        }
        return;
      }

      router.push("/nominations");
    } catch (error) {
      console.error("Failed to create nomination:", error);
      setError("Failed to create nomination. Please try again.");
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
        <Button variant="ghost" onClick={() => router.push("/nominations")}>
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
          className={`h-2 flex-1 rounded-full ${
            step >= 1 ? "bg-primary" : "bg-muted"
          }`}
        />
        <div
          className={`h-2 flex-1 rounded-full ${
            step >= 2 ? "bg-primary" : "bg-muted"
          }`}
        />
        <div
          className={`h-2 flex-1 rounded-full ${
            step >= 3 ? "bg-primary" : "bg-muted"
          }`}
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
              <p className="text-center text-sm text-muted-foreground">
                searching...
              </p>
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
                      {recipient.display_name?.[0] ||
                        recipient.username?.[0] ||
                        "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-semibold">
                      {recipient.display_name ||
                        recipient.username ||
                        "unknown"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      @{recipient.username || "unknown"}
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
              enter details about the tribute you're nominating for @
              {selectedRecipient.username}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-col w-full items-center gap-3">
                <Label htmlFor="tribute-image" className="sr-only">
                  Picture
                </Label>
                <div
                  onClick={() =>
                    document.getElementById("tribute-image")?.click()
                  }
                  className="cursor-pointer relative group"
                >
                  <Avatar className="w-32 h-32 rounded-md">
                    <AvatarImage
                      src={draftImage || undefined}
                      className="object-cover rounded-md w-full h-full"
                    />
                    <AvatarFallback className="w-full p-3 text-center h-full flex items-center justify-center text-sm hover:bg-gray-100 transition rounded-md">
                    <HatGlasses className="transition-opacity hover:opacity-0" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/50 flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                    <Upload className="stroke-white" />
                    <span className="text-white text-sm text-center px-2">
                      drag photos here or upload
                    </span>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pronoun-subject">subject pronoun</Label>
                <Input
                  id="pronoun-subject"
                  placeholder="they"
                  value={tributePronouns.subject}
                  onChange={(e) =>
                    setTributePronouns({
                      ...tributePronouns,
                      subject: e.target.value,
                    })
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
                    setTributePronouns({
                      ...tributePronouns,
                      object: e.target.value,
                    })
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
                    setTributePronouns({
                      ...tributePronouns,
                      possessive: e.target.value,
                    })
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
                    setTributePronouns({
                      ...tributePronouns,
                      reflexive: e.target.value,
                    })
                  }
                />
              </div>
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

            <div className="space-y-2">
              <Label htmlFor="tribute-income">income level (optional)</Label>
              <Input
                id="tribute-income"
                type="number"
                placeholder="e.g. 50000"
                value={tributeIncome}
                onChange={(e) => setTributeIncome(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                used for district suggestions and AI context
              </p>
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
                {submitting ? "sending..." : "send nomination"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
