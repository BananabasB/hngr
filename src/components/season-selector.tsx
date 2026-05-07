"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Trophy, Archive, Edit, Trash2, RefreshCw } from "lucide-react";
import { useAppState } from "@/lib/state-context";
import type { Season, SeasonWithGames } from "@/lib/supabase/season-types";
import { SeasonService } from "@/lib/supabase/services/seasons";

interface SeasonSelectorProps {
  className?: string;
}

export function SeasonSelector({ className }: SeasonSelectorProps) {
  const { currentSeason, seasons, setCurrentSeason, refreshSeasons, createSeason } = useAppState();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState("");
  const [newSeasonDescription, setNewSeasonDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCreateSeason = async () => {
    if (!newSeasonName.trim()) return;

    setIsLoading(true);
    try {
      const season = await createSeason(newSeasonName.trim(), newSeasonDescription.trim() || undefined);
      setCurrentSeason(season);
      setIsCreateDialogOpen(false);
      setNewSeasonName("");
      setNewSeasonDescription("");
    } catch (error) {
      console.error("Failed to create season:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeasonChange = (seasonId: string) => {
    const season = seasons.find(s => s.id === seasonId);
    if (season) {
      setCurrentSeason(season);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSeasons();
    } catch (error) {
      console.error("Failed to refresh seasons:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = (status: Season['status']) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-3 w-3" />;
      case 'active':
        return <Trophy className="h-3 w-3" />;
      case 'completed':
        return <Calendar className="h-3 w-3" />;
      case 'archived':
        return <Archive className="h-3 w-3" />;
    }
  };

  const getStatusColor = (status: Season['status']) => {
    switch (status) {
      case 'draft':
        return "bg-gray-100 text-gray-800";
      case 'active':
        return "bg-green-100 text-green-800";
      case 'completed':
        return "bg-blue-100 text-blue-800";
      case 'archived':
        return "bg-orange-100 text-orange-800";
    }
  };

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {currentSeason ? (
        <div className="flex items-center gap-2 w-full">
          <Select value={currentSeason.id} onValueChange={handleSeasonChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map((season) => (
                <SelectItem key={season.id} value={season.id}>
                  <div className="flex items-center gap-2">
                    <span>{season.name}</span>
                    <Badge className={`text-xs ${getStatusColor(season.status)}`}>
                      {getStatusIcon(season.status)}
                      <span className="ml-1">{season.status}</span>
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">No seasons</span>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-1" />
            New Season
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Season</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="season-name">Season Name</Label>
              <Input
                id="season-name"
                value={newSeasonName}
                onChange={(e) => setNewSeasonName(e.target.value)}
                placeholder="e.g., Season 1, Summer Games"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="season-description">Description (optional)</Label>
              <Textarea
                id="season-description"
                value={newSeasonDescription}
                onChange={(e) => setNewSeasonDescription(e.target.value)}
                placeholder="Describe this season..."
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
                Cancel
              </Button>
              <Button
                onClick={handleCreateSeason}
                disabled={!newSeasonName.trim() || isLoading}
              >
                {isLoading ? "Creating..." : "Create Season"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
