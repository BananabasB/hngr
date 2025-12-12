'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, MapPin, Users, ArrowLeft, UserPlus, UserMinus } from 'lucide-react';
import { CustomEventWithDetails, EventAttendee } from '@/lib/supabase/types';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

interface EventResponse {
  data: CustomEventWithDetails & {
    attendees: (EventAttendee & { user: { id: string; username: string; display_name: string; avatar_url: string | null } })[];
  };
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isPlus } = useAuth();
  const [event, setEvent] = useState<CustomEventWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAttending, setIsAttending] = useState(false);
  const [joining, setJoining] = useState(false);

  const eventId = params.eventId as string;

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      if (!response.ok) throw new Error('Failed to fetch event');
      
      const data: EventResponse = await response.json();
      setEvent(data.data);
      
      // Check if current user is attending
      if (user) {
        const attending = data.data.attendees.some(attendee => attendee.user_id === user.id);
        setIsAttending(attending);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLeave = async () => {
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }

    setJoining(true);
    try {
      const response = await fetch(`/api/events/${eventId}/attendees`, {
        method: isAttending ? 'DELETE' : 'POST',
        headers: {
          'Authorization': `Bearer ${user.id}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update attendance');
      }

      setIsAttending(!isAttending);
      await fetchEvent(); // Refresh event data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update attendance');
    } finally {
      setJoining(false);
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canViewEvent = event?.is_public || isPlus;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">
          <p>{error || 'Event not found'}</p>
          <Button onClick={() => router.push('/events')} className="mt-4">
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  if (!canViewEvent) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">hngr+ Required</h1>
          <p className="text-muted-foreground mb-6">
            This is a private event. You need an hngr+ membership to view and join.
          </p>
          <Button asChild>
            <Link href="/pay/checkout">Upgrade to hngr+</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isFull = event.max_attendees && (event.attendees?.length || 0) >= event.max_attendees;
  const isEventCreator = user?.id === event.creator_id;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/events">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Events
          </Link>
        </Button>
        
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
            <div className="flex items-center gap-3 mb-4">
              {event.is_public ? (
                <Badge variant="secondary">
                  Public Event
                </Badge>
              ) : (
                <Badge variant="outline">
                  hngr+ Only
                </Badge>
              )}
              {isFull && (
                <Badge variant="destructive">
                  Full
                </Badge>
              )}
            </div>
          </div>
          
          {!isEventCreator && (
            <Button
              onClick={handleJoinLeave}
              disabled={joining || !!isFull}
              variant={isAttending ? "outline" : "default"}
            >
              {joining ? (
                'Loading...'
              ) : isAttending ? (
                <>
                  <UserMinus className="w-4 h-4 mr-2" />
                  Leave Event
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  {isFull ? 'Event Full' : 'Join Event'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Event Details</h2>
            </CardHeader>
            <CardContent className="space-y-4">
              {event.description && (
                <div>
                  <h3 className="font-medium mb-2">Description</h3>
                  <p className="text-muted-foreground">{event.description}</p>
                </div>
              )}
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{formatEventDate(event.event_date)}</span>
                </div>
                
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>
                  {(event.attendees?.length || 0)} attendees
                  {event.max_attendees && ` / ${event.max_attendees} max`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Attendees */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-semibold">Attendees ({event.attendees?.length || 0})</h2>
            </CardHeader>
            <CardContent>
              {event.attendees && event.attendees.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {event.attendees.map((attendee) => (
                    <div key={attendee.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Avatar showPlusBadge={attendee.user?.is_plus || false}>
                        <AvatarImage src={attendee.user?.avatar_url || undefined} />
                        <AvatarFallback>
                          {attendee.user?.display_name?.[0] || attendee.user?.username?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {attendee.user?.display_name || attendee.user?.username}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Joined {new Date(attendee.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No attendees yet. Be the first to join!
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Creator Info */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Event Creator</h2>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Avatar showPlusBadge={event.creator?.is_plus || false}>
                  <AvatarImage src={event.creator?.avatar_url || undefined} />
                  <AvatarFallback>
                    {event.creator?.display_name?.[0] || event.creator?.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {event.creator?.display_name || event.creator?.username || 'Unknown'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(event.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {isEventCreator && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Manage Event</h2>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full">
                  Edit Event
                </Button>
                <Button variant="destructive" className="w-full">
                  Delete Event
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
