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
import type { NominationWithDetails } from '@/lib/supabase/types';
import { CheckCircle, XCircle, Heart, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface NominationCardProps {
  nomination: NominationWithDetails;
  type: 'received' | 'sent';
  onAccept?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onVote?: (id: string) => Promise<void>;
  hasVoted?: boolean;
}

export function NominationCard({
  nomination,
  type,
  onAccept,
  onReject,
  onDelete,
  onVote,
  hasVoted = false,
}: NominationCardProps) {
  const [loading, setLoading] = useState(false);
  const [voted, setVoted] = useState(hasVoted);

  const user = type === 'received' ? nomination.nominator : nomination.recipient;
  const tribute = nomination.tribute;

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
        return <Badge className="bg-green-500">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
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
                {type === 'received' ? 'From' : 'To'}{' '}
                {user?.display_name || user?.username || 'Unknown'}
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
          {tribute?.image_url && (
            <Avatar className="h-12 w-12">
              <AvatarImage src={tribute.image_url} />
              <AvatarFallback>{tribute.name[0]}</AvatarFallback>
            </Avatar>
          )}
          <div className="flex-1">
            <p className="font-semibold">{tribute?.name || 'Unknown Tribute'}</p>
            <p className="text-sm text-muted-foreground">
              {tribute?.pronouns
                ? `${tribute.pronouns.subject}/${tribute.pronouns.object}`
                : ''}
            </p>
          </div>
        </div>

        {/* Message */}
        {nomination.message && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm">{nomination.message}</p>
          </div>
        )}

        {/* Vote Count */}
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
        </div>
      </CardContent>

      {/* Actions */}
      {nomination.status === 'pending' && (
        <CardFooter className="flex gap-2">
          {type === 'received' && onAccept && onReject && (
            <>
              <Button
                onClick={() => handleAction(() => onAccept(nomination.id))}
                disabled={loading}
                className="flex-1"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Accept
              </Button>
              <Button
                variant="outline"
                onClick={() => handleAction(() => onReject(nomination.id))}
                disabled={loading}
                className="flex-1"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Decline
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
              Cancel Nomination
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
