"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Calendar,
  Trophy,
  Archive,
  Edit,
  Trash2,
  Plus,
  Gamepad2,
  Users,
  Star,
  ChevronRight
} from "lucide-react";
import { useAppState } from "@/lib/state-context-refactored";
import type { Season, SeasonWithGames, UpdateSeasonRequest } from "@/lib/supabase/season-types";
import { SeasonService } from "@/lib/supabase/services/seasons";
import { DebugAuthButton } from "@/components/debug-auth-button";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";

export default function SeasonsPage() {
  const { seasons, currentSeason, setCurrentSeason, refreshSeasons, createSeason } = useAppState();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [seasonToDelete, setSeasonToDelete] = useState<string | null>(null);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasondescription, setNewSeasondescription] = useState("");
  const [editSeasonName, setEditSeasonName] = useState("");
  const [editSeasondescription, setEditSeasondescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Refresh seasons when page loads
  useEffect(() => {
    refreshSeasons();
  }, [refreshSeasons]);

  const handleCreateSeason = async () => {
    if (!newSeasonName.trim()) return;

    setIsLoading(true);
    try {
      await createSeason(
        newSeasonName.trim(),
        newSeasondescription.trim() || undefined
      );
      setNewSeasonName("");
      setNewSeasondescription("");
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error("Failed to create season:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSeason = async () => {
    if (!editingSeason || !editSeasonName.trim() || !user?.id) return;

    setIsLoading(true);
    try {
      const updateData: UpdateSeasonRequest = {
        name: editSeasonName.trim(),
        description: editSeasondescription.trim() || undefined,
      };

      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      const { createSupabaseClientWithToken } = await import('@/lib/supabase/clerk-client');
      const supabaseClient = createSupabaseClientWithToken(token);

      const updatedSeason = await SeasonService.updateSeason(supabaseClient, user.id, editingSeason.id, updateData);
      await refreshSeasons();

      // Update current season if it was the one being edited
      if (currentSeason?.id === editingSeason.id) {
        setCurrentSeason(updatedSeason);
      }

      setIsEditDialogOpen(false);
      setEditingSeason(null);
      setEditSeasonName("");
      setEditSeasondescription("");
    } catch (error) {
      console.error("Failed to update season:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteDialog = (seasonId: string) => {
    setSeasonToDelete(seasonId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSeason = async () => {
    if (!seasonToDelete || !user?.id) return;

    console.log('=== DELETE SEASON START ===');
    console.log('Season ID:', seasonToDelete);
    console.log('User:', user);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Debug: Check token contents
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('Token payload:', {
          sub: payload.sub,
          aud: payload.aud,
          role: payload.role,
          exp: payload.exp,
          iat: payload.iat
        });
      }

      const { createSupabaseClientWithToken } = await import('@/lib/supabase/clerk-client');
      const supabaseClient = createSupabaseClientWithToken(token);

      // Debug: Check auth status
      const { data: authData, error: authError } = await supabaseClient.auth.getUser();
      console.log('Supabase auth check:', { authData, authError });

      console.log('Calling deleteSeason with user.id:', user.id);
      await SeasonService.deleteSeason(supabaseClient, user.id, seasonToDelete);
      console.log('Season deleted successfully');

      await refreshSeasons();

      // Clear current season if it was deleted
      if (currentSeason?.id === seasonToDelete) {
        setCurrentSeason(null);
      }

      setDeleteDialogOpen(false);
      setSeasonToDelete(null);
    } catch (error) {
      console.error("Failed to delete season - detailed error:", {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      alert(`Failed to delete season: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    console.log('=== DELETE SEASON END ===');
  };

  const openEditDialog = (season: Season) => {
    setEditingSeason(season);
    setEditSeasonName(season.name);
    setEditSeasondescription(season.description || "");
    setIsEditDialogOpen(true);
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">seasons</h1>
          <p className="text-muted-foreground">manage your game seasons and organize multiple games</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              new season
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>create new season</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="season-name">season name</Label>
                <Input
                  id="season-name"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  placeholder="e.g., Season 1, Summer Games"
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="season-description">description (optional)</Label>
                <Textarea
                  id="season-description"
                  value={newSeasondescription}
                  onChange={(e) => setNewSeasondescription(e.target.value)}
                  placeholder="describe this season..."
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isLoading}
                >
                  cancel
                </Button>
                <Button
                  onClick={handleCreateSeason}
                  disabled={!newSeasonName.trim() || isLoading}
                >
                  {isLoading ? "creating..." : "create season"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {seasons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">no seasons yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              create your first season to start organizing your games
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              create season
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {seasons.map((season) => (
            <Card
              key={season.id}
              className={`relative cursor-pointer transition-all hover:shadow-md ${
                currentSeason?.id === season.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setCurrentSeason(season)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{season.name}</CardTitle>
                </div>
                {season.description && (
                  <CardDescription className="text-sm">
                    {season.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Gamepad2 className="h-4 w-4" />
                      <span>{season.game_count} games</span>
                    </div>
                    {season.has_current_game && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4" />
                        <span>active</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Created {formatDate(season.created_at)}
                  {season.updated_at !== season.created_at && (
                    <span> • Updated {formatDate(season.updated_at)}</span>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Link href={`/seasons/${season.id}`} className="flex-1">
                    <Button size="sm" variant="outline" className="w-full">
                      view details
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(season);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteDialog(season.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* edit season Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>edit season</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-season-name">Season Name</Label>
              <Input
                id="edit-season-name"
                value={editSeasonName}
                onChange={(e) => setEditSeasonName(e.target.value)}
                placeholder="season name"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="edit-season-description">description</Label>
              <Textarea
                id="edit-season-description"
                value={editSeasondescription}
                onChange={(e) => setEditSeasondescription(e.target.value)}
                placeholder="describe this season..."
                rows={3}
                maxLength={500}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isLoading}
              >
                cancel
              </Button>
              <Button
                onClick={handleEditSeason}
                disabled={!editSeasonName.trim() || isLoading}
              >
                {isLoading ? "updating..." : "update season"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              this action cannot be undone. this will permanently delete the season
              and all associated games and data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setSeasonToDelete(null);
            }}>
              cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSeason}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              delete season
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
