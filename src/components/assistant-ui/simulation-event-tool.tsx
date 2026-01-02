import type { ToolCallMessagePartComponent } from "@assistant-ui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XCircleIcon,
  SparklesIcon,
  UsersIcon,
  SwordIcon,
  HeartIcon,
  PackageIcon,
  UtensilsIcon,
  DumbbellIcon,
  Loader2,
  PlusIcon,
  CrownIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { 
  Item, 
  ItemGroup, 
  ItemMedia, 
  ItemContent, 
  ItemTitle, 
  ItemDescription, 
  ItemActions 
} from "@/components/ui/item";

const getEventIcon = (type: string) => {
  switch (type) {
    case 'kill':
    case 'kill2':
      return <SwordIcon className="size-4 text-destructive" />;
    case 'alliance':
      return <UsersIcon className="size-4 text-primary" />;
    case 'find':
      return <PackageIcon className="size-4 text-green-600 dark:text-green-400" />;
    case 'feast':
      return <UtensilsIcon className="size-4 text-orange-600 dark:text-orange-400" />;
    case 'training':
      return <DumbbellIcon className="size-4 text-purple-600 dark:text-purple-400" />;
    case 'combat':
      return <SwordIcon className="size-4 text-red-600 dark:text-red-400" />;
    default:
      return <SparklesIcon className="size-4 text-muted-foreground" />;
  }
};

const getEventTypeDescription = (type: string) => {
  switch (type) {
    case 'kill':
      return 'Single Death Event';
    case 'kill2':
      return 'Double Death Event';
    case 'alliance':
      return 'Alliance Formation';
    case 'find':
      return 'Resource Discovery';
    case 'feast':
      return 'Feast Event';
    case 'training':
      return 'Training Event';
    case 'combat':
      return 'Combat Event';
    default:
      return 'General Event';
  }
};

const getEventTypeVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (type) {
    case 'kill':
    case 'kill2':
      return 'destructive';
    case 'alliance':
      return 'default';
    case 'find':
      return 'secondary';
    case 'feast':
      return 'outline';
    case 'training':
      return 'secondary';
    case 'combat':
      return 'destructive';
    default:
      return 'outline';
  }
};

export const SimulationEventTool: ToolCallMessagePartComponent = ({
  toolName,
  argsText,
  result,
  status,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isCancelled =
    status?.type === "incomplete" && status.reason === "cancelled";
  const cancelledReason =
    isCancelled && status.error
      ? typeof status.error === "string"
        ? status.error
        : JSON.stringify(status.error)
      : null;

  // Parse the arguments safely - handle various formats
  let args: Record<string, any> = {};
  try {
    // Check if argsText is valid and not empty
    if (!argsText || argsText.trim() === '') {
      args = {};
    } else if (argsText.trim().startsWith('{')) {
      // Try parsing as JSON, but ensure it's complete
      const trimmedText = argsText.trim();
      if (trimmedText.endsWith('}')) {
        args = JSON.parse(trimmedText);
      } else {
        console.warn('Incomplete JSON object, using fallback parsing');
        // Fallback parsing for incomplete JSON
        args = { title: 'Processing...', type: 'generic', roles: [], text_template: trimmedText };
      }
    } else {
      // If not JSON, try to extract key-value pairs
      const pairs = argsText.split(',');
      args = {};
      pairs.forEach(pair => {
        const [key, ...valueParts] = pair.split(':');
        if (key && valueParts.length > 0) {
          const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
          args[key.trim().replace(/^["']|["']$/g, '')] = value;
        }
      });
    }
  } catch (e) {
    console.error('Failed to parse tool args:', e, 'Raw argsText:', argsText);
    // Fallback: try to extract basic info
    args = { title: 'Creating Event...', type: 'generic', roles: [], text_template: argsText };
  }

  const { title, type, roles, text_template } = args as {
    title?: string;
    type?: string;
    roles?: string[];
    text_template?: string;
  };

  if (toolName === 'previewSimulationEventTemplate') {
    return (
      <Card className="my-4 border-2 transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getEventIcon(type || '')}
              <div>
                <h3 className="font-semibold text-lg leading-tight">
                  {title || 'Event Preview'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {getEventTypeDescription(type || '')} - Preview
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCancelled ? (
                <XCircleIcon className="size-5 text-destructive" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-blue-500 animate-pulse" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 p-0"
              >
                {isCollapsed ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="pt-0 space-y-4">
            {/* Roles */}
            {roles && roles.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Participants:</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role, index) => (
                    <Badge key={index} variant={getEventTypeVariant(type || '')}>
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Event Template Preview */}
            {text_template && (
              <div>
                <p className="text-sm font-medium mb-2">Event Preview:</p>
                <div className="p-3 bg-muted/50 border rounded-lg">
                  <p className="text-sm italic text-muted-foreground">
                    "{text_template}"
                  </p>
                </div>
              </div>
            )}

            {/* Preview Message */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="font-semibold text-blue-800 dark:text-blue-200 text-sm flex items-center gap-2">
                <SparklesIcon className="size-4" />
                Event Preview Ready
              </p>
              <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                Review this event design. Tell me if you'd like me to create it or make any changes!
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  if (toolName === 'createMultipleSimulationEventTemplates') {
    const { events, results } = args as {
      events?: any[];
      results?: any[];
    };

    return (
      <Card className="my-4 border-2  transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PackageIcon className="size-5 text-purple-600" />
              <div>
                <h3 className="font-semibold text-lg leading-tight">
                  creating multiple events
                </h3>
                <p className="text-sm text-muted-foreground">
                  batch event creation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCancelled ? (
                <XCircleIcon className="size-5 text-destructive" />
              ) : result ? (
                <CheckIcon className="size-5 text-green-600 dark:text-green-400" />
              ) : (
                <Loader2 className="size-5 animate-spin text-primary" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 p-0"
              >
                {isCollapsed ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="pt-0 space-y-4">
            {/* Events List */}
            {events && events.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Events to Create:</p>
                <div className="space-y-2">
                  {events.map((event, index) => (
                    <div key={index} className="p-2 bg-muted/30 border rounded">
                      <div className="flex items-center gap-2 mb-1">
                        {getEventIcon(event.type)}
                        <span className="font-medium text-sm">{event.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {getEventTypeDescription(event.type)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        "{event.text_template}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {results && results.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Results:</p>
                <div className="space-y-2">
                  {results.map((result, index) => (
                    <div key={index} className={`p-2 border rounded ${
                      result.success 
                        ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                        : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckIcon className="size-4 text-green-600" />
                        ) : (
                          <XCircleIcon className="size-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm">{result.title}</span>
                      </div>
                      {!result.success && result.error && (
                        <p className="text-xs text-red-600 mt-1">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success State */}
            {!isCancelled && result !== undefined && (
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="font-semibold text-green-800 dark:text-green-200 text-sm flex items-center gap-2">
                  <CheckIcon className="size-4" />
                  Batch Creation Complete!
                </p>
                <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                  Your events have been processed and added to the simulation.
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  }
    if (toolName === 'createSimulationEventTemplate') {
    return (
      <Card className="my-4 border-2 transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getEventIcon(type || '')}
              <div>
                <h3 className="font-semibold text-lg leading-tight">
                  {title || 'Creating Game Event...'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {getEventTypeDescription(type || '')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCancelled ? (
                <XCircleIcon className="size-5 text-destructive" />
              ) : result ? (
                <CheckIcon className="size-5 text-green-600 dark:text-green-400" />
              ) : (
                <Loader2 className="size-5 animate-spin text-primary" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 p-0"
              >
                {isCollapsed ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="pt-0 space-y-4">
            {/* Roles */}
            {roles && roles.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Participants:</p>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role, index) => (
                    <Badge key={index} variant={getEventTypeVariant(type || '')}>
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Error State */}
            {cancelledReason && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="font-semibold text-destructive text-sm">
                  Cancelled reason:
                </p>
                <p className="text-destructive/80 text-sm mt-1">
                  {cancelledReason}
                </p>
              </div>
            )}

            {/* Event Template Preview */}
            {text_template && (
              <div>
                <p className="text-sm font-medium mb-2">Event Preview:</p>
                <div className="p-3 bg-muted/50 border rounded-lg">
                  <p className="text-sm italic text-muted-foreground">
                    "{text_template}"
                  </p>
                </div>
              </div>
            )}

            {/* Success State */}
            {!isCancelled && result !== undefined && (
              <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="font-semibold text-green-800 dark:text-green-200 text-sm flex items-center gap-2">
                  <CheckIcon className="size-4" />
                  Event Created Successfully!
                </p>
                <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                  Your game event template has been saved and will appear in simulations.
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  // Handle user management tools
  if (toolName === 'searchUsers') {
    const { query, limit } = args as { query?: string; limit?: number };
    return (
      <Card className="my-4 border-2 border-blue-200 dark:border-blue-800 transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UsersIcon className="size-5 text-blue-600" />
              <div>
                <h3 className="font-semibold text-lg leading-tight">
                  Searching Users
                </h3>
                <p className="text-sm text-muted-foreground">
                  {query ? `Searching for "${query}"` : 'User Search'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCancelled ? (
                <XCircleIcon className="size-5 text-destructive" />
              ) : result ? (
                <CheckIcon className="size-5 text-green-600 dark:text-green-400" />
              ) : (
                <Loader2 className="size-5 animate-spin text-primary" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 p-0"
              >
                {isCollapsed ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="pt-0 space-y-4">
            {query && (
              <div>
                <p className="text-sm font-medium mb-2">Search Query:</p>
                <div className="p-2 bg-muted/50 border rounded">
                  <code className="text-sm">{query}</code>
                </div>
              </div>
            )}

            {result && (
              <div>
                <p className="text-sm font-medium mb-4">Here you go! Found {result.users?.length || 0} users:</p>
                {result.success && result.users ? (
                  <ItemGroup>
                    {result.users.length > 0 ? (
                      result.users.map((user: any, index: number) => (
                        <Item key={index}>
                          <ItemMedia variant="image">
                            <div className="relative">
                              {user.avatar_url ? (
                                <Image
                                  src={user.avatar_url}
                                  alt={`${user.username || user.email}'s avatar`}
                                  width={40}
                                  height={40}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                  {(user.username || user.email || '?').charAt(0).toUpperCase()}
                                </div>
                              )}
                              
                              {user.is_plus && (
                                <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-0.5">
                                  <CrownIcon className="size-2.5 text-white" />
                                </div>
                              )}
                            </div>
                          </ItemMedia>
                          
                          <ItemContent>
                            <ItemTitle>
                              <div className="flex items-center gap-2">
                                <span>{user.username || user.email}</span>
                                {user.is_plus && (
                                  <Badge variant="secondary" className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 px-1.5 py-0.5">
                                    hngr+
                                  </Badge>
                                )}
                              </div>
                            </ItemTitle>
                            {user.display_name && (
                              <ItemDescription>{user.display_name}</ItemDescription>
                            )}
                            <ItemDescription className="text-xs">{user.email}</ItemDescription>
                          </ItemContent>
                          
                          <ItemActions>
                            <Button size="sm" variant="outline">
                              <PlusIcon className="size-3 mr-1" />
                              Follow
                            </Button>
                          </ItemActions>
                        </Item>
                      ))
                    ) : (
                      <Item>
                        <ItemMedia variant="icon">
                          <UsersIcon className="size-8 text-muted-foreground" />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>No users found</ItemTitle>
                          <ItemDescription>Try a different search term</ItemDescription>
                        </ItemContent>
                      </Item>
                    )}
                  </ItemGroup>
                ) : (
                  <Item variant="muted">
                    <ItemMedia variant="icon">
                      <XCircleIcon className="size-4 text-destructive" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>Search failed</ItemTitle>
                      <ItemDescription>{result.error || 'Something went wrong'}</ItemDescription>
                    </ItemContent>
                  </Item>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  if (toolName === 'getUserInfo') {
    const { identifier } = args as { identifier?: string };
    return (
      <Card className="my-4 border-2 border-green-200 dark:border-green-800 transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UsersIcon className="size-5 text-green-600" />
              <div>
                <h3 className="font-semibold text-lg leading-tight">
                  User Info
                </h3>
                <p className="text-sm text-muted-foreground">
                  {identifier ? `Looking up: ${identifier}` : 'User Information'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCancelled ? (
                <XCircleIcon className="size-5 text-destructive" />
              ) : result ? (
                <CheckIcon className="size-5 text-green-600 dark:text-green-400" />
              ) : (
                <Loader2 className="size-5 animate-spin text-primary" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 p-0"
              >
                {isCollapsed ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="pt-0 space-y-4">
            {identifier && (
              <Item variant="muted">
                <ItemContent>
                  <ItemTitle>Search Identifier</ItemTitle>
                  <ItemDescription>{identifier}</ItemDescription>
                </ItemContent>
              </Item>
            )}

            {result && (
              <>
                {result.success && result.user ? (
                  <Item>
                    <ItemMedia variant="image">
                      <div className="relative">
                        {result.user.avatar_url ? (
                          <Image
                            src={result.user.avatar_url}
                            alt={`${result.user.username || result.user.email}'s avatar`}
                            width={48}
                            height={48}
                            className="rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {(result.user.username || result.user.email || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                        
                        {result.user.is_plus && (
                          <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-1">
                            <CrownIcon className="size-3 text-white" />
                          </div>
                        )}
                      </div>
                    </ItemMedia>
                    
                    <ItemContent>
                      <ItemTitle>
                        <div className="flex items-center gap-2">
                          <span>{result.user.username || result.user.email}</span>
                          {result.user.is_plus && (
                            <Badge variant="secondary" className="text-xs bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 px-1.5 py-0.5">
                              hngr+
                            </Badge>
                          )}
                        </div>
                      </ItemTitle>
                      {result.user.display_name && (
                        <ItemDescription>{result.user.display_name}</ItemDescription>
                      )}
                      <ItemDescription>{result.user.email}</ItemDescription>
                      <ItemDescription>hngr+: {result.user.is_plus ? 'Yes' : 'No'}</ItemDescription>
                    </ItemContent>
                  </Item>
                ) : (
                  <Item variant="muted">
                    <ItemMedia variant="icon">
                      <XCircleIcon className="size-4 text-destructive" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>User not found</ItemTitle>
                      <ItemDescription>{result.error || 'Could not find user'}</ItemDescription>
                    </ItemContent>
                  </Item>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  if (toolName === 'listSimulationEvents') {
    const { includeMine, limit } = args as { includeMine?: boolean; limit?: number };
    return (
      <Card className="my-4 border-2 border-purple-200 dark:border-purple-800 transition-all duration-200 hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PackageIcon className="size-5 text-purple-600" />
              <div>
                <h3 className="font-semibold text-lg leading-tight">
                  Events
                </h3>
                <p className="text-sm text-muted-foreground">
                  {includeMine ? 'My Events' : 'All Events'} {limit && `(Limit: ${limit})`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isCancelled ? (
                <XCircleIcon className="size-5 text-destructive" />
              ) : result ? (
                <CheckIcon className="size-5 text-green-600 dark:text-green-400" />
              ) : (
                <Loader2 className="size-5 animate-spin text-primary" />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 p-0"
              >
                {isCollapsed ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isCollapsed && (
          <CardContent className="pt-0 space-y-4">
            <div className="flex gap-2 mb-4">
              {includeMine && <Badge variant="default">My Events</Badge>}
              {limit && <Badge variant="outline">Limit: {limit}</Badge>}
            </div>

            {result && (
              <>
                {result.success && result.events ? (
                  <ItemGroup>
                    {result.events.length > 0 ? (
                      result.events.map((event: any, index: number) => (
                        <Item key={index}>
                          <ItemMedia variant="icon">
                            {getEventIcon(event.type)}
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{event.title}</ItemTitle>
                            <ItemDescription>{getEventTypeDescription(event.type)}</ItemDescription>
                            <ItemDescription>Created by: {event.creator?.username || 'Unknown'}</ItemDescription>
                          </ItemContent>
                        </Item>
                      ))
                    ) : (
                      <Item>
                        <ItemMedia variant="icon">
                          <PackageIcon className="size-8 text-muted-foreground" />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>No events found</ItemTitle>
                          <ItemDescription>Try adjusting your filters</ItemDescription>
                        </ItemContent>
                      </Item>
                    )}
                  </ItemGroup>
                ) : (
                  <Item variant="muted">
                    <ItemMedia variant="icon">
                      <XCircleIcon className="size-4 text-destructive" />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>Failed to load events</ItemTitle>
                      <ItemDescription>{result.error || 'Something went wrong'}</ItemDescription>
                    </ItemContent>
                  </Item>
                )}
              </>
            )}
          </CardContent>
        )}
      </Card>
    );
  }

  // Fallback for other tools - use shadcn Card
  return (
    <Card className="my-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCancelled ? (
              <XCircleIcon className="size-4 text-destructive" />
            ) : (
              <CheckIcon className="size-4 text-green-600 dark:text-green-400" />
            )}
            <p className="font-medium">
              {isCancelled ? "Cancelled tool: " : "Used tool: "}
              <span className="font-semibold">{toolName}</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
          </Button>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {cancelledReason && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="font-semibold text-destructive text-sm">
                Cancelled reason:
              </p>
              <p className="text-destructive/80 text-sm mt-1">
                {cancelledReason}
              </p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium mb-2">Arguments:</p>
            <pre className="text-xs bg-muted/50 p-3 rounded border overflow-x-auto">
              {argsText}
            </pre>
          </div>

          {!isCancelled && result !== undefined && (
            <div>
              <p className="text-sm font-medium mb-2">Result:</p>
              <pre className="text-xs bg-muted/50 p-3 rounded border overflow-x-auto">
                {typeof result === "string"
                  ? result
                  : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};
