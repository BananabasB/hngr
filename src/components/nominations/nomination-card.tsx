'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import type { NominationWithDetails } from '@/lib/supabase/types';
import { CheckCircle, XCircle, Heart, Trash2, DollarSign, Flag } from 'lucide-react';
import { useState } from 'react';
import type { Tribute } from '@/lib/setup';

interface NominationCardProps {
  nomination: NominationWithDetails;
  type: 'received' | 'sent';
  onAccept?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onVote?: (id: string) => Promise<void>;
  onReport?: (id: string, reason: string, details?: string) => Promise<void>;
  hasVoted?: boolean;
  userReported?: boolean;
  reportCount?: number;
}

export function NominationCard({
  nomination,
  type,
  onAccept,
  onReject,
  onDelete,
  onVote,
  onReport,
  hasVoted = false,
  userReported = false,
  reportCount = 0,
}: NominationCardProps) {
  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState(hasVoted);

  const user = type === 'received' ? nomination.nominator : nomination.recipient;

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    try {
      await action();
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (onVote) {
      await handleAction(async () => {
        await onVote(nomination.id);
        setVoted(!voted);
      });
    }
  };

  const getStatusBadge = () => {
    switch (nomination.status) {
      case 'accepted':
        return <Badge className="bg-green-500">accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">rejected</Badge>;
      case 'expired':
        return <Badge variant="secondary">expired</Badge>;
      default:
        return <Badge variant="outline">pending</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user?.avatar_url || undefined} />
              <AvatarFallback>
                {user?.display_name?.[0] || user?.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">
                {type === 'received' ? 'from' : 'to'}{' '}
                {user?.display_name || user?.username || 'unknown'}
              </CardTitle>
              <CardDescription>
                {new Date(nomination.created_at).toLocaleDateString()}
              </CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tribute Info */}
        <div className="flex items-center gap-3 rounded-lg border p-3">
          {nomination.tribute_image_url && (
            <Avatar className="h-12 w-12">
              <AvatarImage src={nomination.tribute_image_url} />
              <AvatarFallback>{nomination.tribute_name[0]}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1">
            <p className="font-semibold">{nomination.tribute_name || 'unknown tribute'}</p>
            <p className="text-sm text-muted-foreground">
              {nomination.tribute_pronouns
                ? `${nomination.tribute_pronouns.subject}/${nomination.tribute_pronouns.object}`
                : ''}
            </p>
            {nomination.tribute_bio && (
              <p className="mt-1 text-sm text-muted-foreground">{nomination.tribute_bio}</p>
            )}
          </div>
        </div>

        {/* Message */}
        {nomination.message && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm">{nomination.message}</p>
          </div>
        )}

        {/* Income Level */}
        {nomination.income && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>Income Level: {nomination.income}</span>
          </div>
        )}

        {/* Vote Count and Report */}
        <div className="flex items-center gap-2">
          <Button
            variant={voted ? 'default' : 'outline'}
            size="sm"
            onClick={handleVote}
            disabled={loading || nomination.status !== 'pending'}
          >
            <Heart className={`h-4 w-4 ${voted ? 'fill-current' : ''}`} />
            <span className="ml-2">{nomination.votes}</span>
          </Button>
          <span className="text-sm text-muted-foreground">
            {nomination.votes === 1 ? 'vote' : 'votes'}
          </span>

          {onReport && !userReported && (
            <ReportDialog
              nominationId={nomination.id}
              onReport={onReport}
              loading={loading}
              setLoading={setLoading}
            />
          )}

          {userReported && (
            <Badge variant="outline" className="text-xs">
              <Flag className="h-3 w-3 mr-1" />
              reported
            </Badge>
          )}

          {reportCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {reportCount} report{reportCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardContent>

      {/* Actions */}
      {nomination.status === 'pending' && (
        <CardFooter className="flex gap-2">
          {type === 'received' && onAccept && onReject && (
            <>
              <AcceptWithTributeDialog
                nomination={nomination}
                onAccept={onAccept}
                loading={loading}
                setLoading={setLoading}
              />
              <Button
                variant="outline"
                onClick={() => handleAction(() => onReject(nomination.id))}
                disabled={loading}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                decline
              </Button>
            </>
          )}

          {type === 'sent' && onDelete && (
            <Button
              variant="outline"
              onClick={() => handleAction(() => onDelete(nomination.id))}
              disabled={loading}
              className="w-full"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              cancel nomination
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

// Dialog for tribute acceptance with district selection
function AcceptWithTributeDialog({
  nomination,
  onAccept,
  loading,
  setLoading,
}: {
  nomination: NominationWithDetails;
  onAccept: (id: string) => Promise<void>;
  loading: boolean;
  setLoading: (b: boolean) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [step, setStep] = useState<'district' | 'replace'>('district');
  const [replaceChoice, setReplaceChoice] = useState<string>('');

  // Get existing tributes from localStorage
  const getTributes = (): Tribute[] => {
    try {
      return JSON.parse(localStorage.getItem('tributes') || '[]');
    } catch {
      return [];
    }
  };

  // Get suggested district based on income
  const getSuggestedDistrict = (): number => {
    if (nomination.income) {
      const income = nomination.income;
      if (income < 25000) return 1;
      else if (income < 50000) return 2;
      else if (income < 75000) return 3;
      else if (income < 100000) return 4;
      else if (income < 150000) return 5;
      else if (income < 200000) return 6;
      else return 7;
    }
    return 1; // Default
  };

  // Get all districts (1-12)
  const allDistricts = Array.from({ length: 12 }, (_, i) => i + 1);

  // Get tributes in selected district
  const getTributesInDistrict = (district: number): Tribute[] => {
    return getTributes().filter(t => t.district === district);
  };

  const suggestedDistrict = getSuggestedDistrict();

  const handleDistrictSelect = (district: string) => {
    setSelectedDistrict(district);
    const districtNum = parseInt(district);
    const existingTributes = getTributesInDistrict(districtNum);

    if (existingTributes.length > 0) {
      // District has existing tributes, go to replace step
      setStep('replace');
    } else {
      // District is empty, proceed directly to acceptance
      handleAcceptClick(districtNum, null);
    }
  };

  const handleAcceptClick = async (districtNum?: number, replaceIndex?: number | null) => {
    const district = districtNum || parseInt(selectedDistrict);
    setLoading(true);
    try {
      await onAccept(nomination.id);

      // Create tribute data
      const tribute: Tribute = {
        name: nomination.tribute_name || 'unknown',
        pronouns: nomination.tribute_pronouns || {
          subject: 'it',
          object: 'it',
          possessive: 'its',
          reflexive: 'itself',
        },
        image: nomination.tribute_image_url || null,
        id: nomination.id,
        district: district,
        relationships: {},
        health: { physical: 100, mental: 100 },
        foodLvl: 0,
      };

      // Save to localStorage
      const tributes = getTributes();

      if (replaceIndex !== null && replaceIndex !== undefined && replaceIndex >= 0) {
        // Replace existing tribute
        const existingTributes = getTributesInDistrict(district);
        const tributeToReplace = existingTributes[replaceIndex];
        if (tributeToReplace) {
          const replaceIndex = tributes.findIndex(t => t.id === tributeToReplace.id);
          if (replaceIndex !== -1) {
            tributes[replaceIndex] = tribute;
          }
        }
      } else {
        // Add as new tribute
        tributes.push(tribute);
      }

      localStorage.setItem('tributes', JSON.stringify(tributes));

      setDialogOpen(false);
      setStep('district');
      setSelectedDistrict('');
      setReplaceChoice('');

      const action = replaceIndex !== null && replaceIndex !== undefined && replaceIndex >= 0 ? 'replaced' : 'added to';
      alert(`Tribute accepted and ${action} district ${district}!`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDistrict = () => {
    setStep('district');
    setSelectedDistrict('');
    setReplaceChoice('');
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      // Reset state when dialog closes
      setStep('district');
      setSelectedDistrict('');
      setReplaceChoice('');
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button disabled={loading} className="flex-1">
          <CheckCircle className="mr-2 h-4 w-4" />
          accept
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'district' ? 'Accept Tribute Nomination' : 'Choose Tribute to Replace'}
          </DialogTitle>
          <DialogDescription>
            {step === 'district'
              ? `Choose which district to place this tribute in. ${nomination.income ? `Based on the income level of $${nomination.income.toLocaleString()}, district ${suggestedDistrict} is suggested.` : ''}`
              : `District ${selectedDistrict} already has tributes. Choose which one to replace or add as new.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {step === 'district' ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="district">Select District (1-12)</Label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {allDistricts.map((district) => {
                    const hasTributes = getTributesInDistrict(district).length > 0;
                    return (
                      <Button
                        key={district}
                        variant={selectedDistrict === district.toString() ? "default" : "outline"}
                        className={`justify-start ${district === suggestedDistrict ? 'ring-2 ring-primary' : ''}`}
                        onClick={() => handleDistrictSelect(district.toString())}
                      >
                        District {district}
                        {district === suggestedDistrict && " ⭐"}
                        {hasTributes && " (occupied)"}
                      </Button>
                    );
                  })}
                </div>
                {suggestedDistrict && (
                  <p className="text-xs text-muted-foreground">
                    ⭐ District {suggestedDistrict} suggested based on income level
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="grid gap-2">
                <Label>Choose what to do with District {selectedDistrict}</Label>
                <RadioGroup value={replaceChoice} onValueChange={setReplaceChoice}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id="replace-new" />
                    <Label htmlFor="replace-new">Add as new tribute to district</Label>
                  </div>
                  {getTributesInDistrict(parseInt(selectedDistrict)).map((tribute, index) => (
                    <div key={tribute.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={`replace-${index}`} id={`replace-${index}`} />
                      <Label htmlFor={`replace-${index}`}>
                        Replace "{tribute.name}"
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </>
          )}

          <div className="rounded-lg bg-muted p-3">
            <h4 className="font-semibold mb-2">Tribute Details:</h4>
            <p className="text-sm"><strong>Name:</strong> {nomination.tribute_name}</p>
            {nomination.tribute_pronouns && (
              <p className="text-sm">
                <strong>Pronouns:</strong> {nomination.tribute_pronouns.subject}/{nomination.tribute_pronouns.object}
              </p>
            )}
            {nomination.income && (
              <p className="text-sm"><strong>Income:</strong> ${nomination.income.toLocaleString()}</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          {step === 'replace' && (
            <Button variant="outline" onClick={handleBackToDistrict}>
              Back to District Selection
            </Button>
          )}
          <Button
            onClick={() => {
              if (step === 'district') {
                const districtNum = parseInt(selectedDistrict);
                handleAcceptClick(districtNum, null);
              } else {
                // Handle replace choice
                if (replaceChoice === 'new') {
                  handleAcceptClick(parseInt(selectedDistrict), null);
                } else if (replaceChoice.startsWith('replace-')) {
                  const index = parseInt(replaceChoice.split('-')[1]);
                  handleAcceptClick(parseInt(selectedDistrict), index);
                }
              }
            }}
            disabled={(!selectedDistrict && step === 'district') || (!replaceChoice && step === 'replace') || loading}
          >
            {step === 'district'
              ? `Accept & Add to District ${selectedDistrict}`
              : replaceChoice === 'new'
                ? 'Add as New'
                : 'Replace Selected Tribute'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Report dialog for inappropriate nominations
function ReportDialog({
  nominationId,
  onReport,
  loading,
  setLoading,
}: {
  nominationId: string;
  onReport: (id: string, reason: string, details?: string) => Promise<void>;
  loading: boolean;
  setLoading: (b: boolean) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState<string>('');

  const handleReport = async () => {
    if (!reason) return;

    setLoading(true);
    try {
      await onReport(nominationId, reason, details || undefined);
      setDialogOpen(false);
      setReason('');
      setDetails('');
    } finally {
      setLoading(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setReason('');
      setDetails('');
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" disabled={loading}>
          <Flag className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Nomination</DialogTitle>
          <DialogDescription>
            Help keep our community safe by reporting inappropriate content.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for report</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inappropriate_content" id="inappropriate" />
                <Label htmlFor="inappropriate">Inappropriate content</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="harassment" id="harassment" />
                <Label htmlFor="harassment">Harassment or bullying</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spam" id="spam" />
                <Label htmlFor="spam">Spam or unwanted content</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="offensive" id="offensive" />
                <Label htmlFor="offensive">Offensive or discriminatory</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other">Other</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="details">Additional details (optional)</Label>
            <Textarea
              id="details"
              placeholder="Provide more context about why you're reporting this nomination..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleReport} disabled={!reason || loading}>
            {loading ? 'Reporting...' : 'Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

