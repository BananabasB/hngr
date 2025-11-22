'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Phone, MessageCircle, ExternalLink, AlertTriangle, Heart } from 'lucide-react';
import type { ResourceGuidance, MentalHealthResource } from '@/lib/mental-health-resources';

interface MentalHealthResourcesProps {
  guidance: ResourceGuidance;
  compact?: boolean;
  dialog?: boolean;
}

const ResourceItem = ({ resource }: { resource: MentalHealthResource }) => (
  <Card className="mb-3">
    <CardHeader className="pb-2">
      <div className="flex items-start justify-between">
        <CardTitle className="text-sm font-medium">{resource.name}</CardTitle>
        {resource.crisis && (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Crisis
          </Badge>
        )}
      </div>
      <CardDescription className="text-xs">{resource.description}</CardDescription>
    </CardHeader>
    <CardContent className="pt-0">
      <div className="flex flex-wrap gap-2">
        {resource.phone && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => window.open(`tel:${resource.phone}`, '_blank')}
          >
            <Phone className="w-3 h-3 mr-1" />
            Call
          </Button>
        )}
        {resource.text && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => window.open(`sms:${resource.text?.split(' ')[2]}`, '_blank')}
          >
            <MessageCircle className="w-3 h-3 mr-1" />
            Text
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => window.open(resource.website, '_blank')}
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          Visit
        </Button>
      </div>
    </CardContent>
  </Card>
);

const ResourcesContent = ({ guidance }: { guidance: ResourceGuidance }) => (
  <div className="space-y-4">
    <Alert className={guidance.urgent ? "border-destructive bg-destructive/5" : "border-blue-500 bg-blue-50"}>
      <Heart className="h-4 w-4" />
      <AlertTitle>{guidance.title}</AlertTitle>
      <AlertDescription className="mt-2">
        {guidance.message}
        {guidance.urgent && (
          <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm">
            <strong>⚠️ If this is an emergency:</strong> Please call emergency services (911) immediately.
          </div>
        )}
      </AlertDescription>
    </Alert>

    <div className="space-y-2">
      <h4 className="font-medium text-sm">Available Support Resources:</h4>
      {guidance.resources.map((resource, index) => (
        <ResourceItem key={index} resource={resource} />
      ))}
    </div>

    <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
      <p>
        <strong>Remember:</strong> You're not alone. These resources are here to help you or someone you know.
        Professional support is always available, and there's no shame in asking for help.
      </p>
    </div>
  </div>
);

export function MentalHealthResources({ guidance, compact = false, dialog = false }: MentalHealthResourcesProps) {

  if (dialog) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="link" size="sm" className="h-auto p-0 text-xs">
            <Heart className="h-4 w-4 mr-1" />
            View mental health resources →
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mental Health Support Resources</DialogTitle>
            <DialogDescription>
              These resources are here to support you and help you get the assistance you need.
            </DialogDescription>
          </DialogHeader>
          <ResourcesContent guidance={guidance} />
        </DialogContent>
      </Dialog>
    );
  }

  if (compact) {
    return (
      <Alert className={(guidance.urgent ? "border-destructive bg-destructive/5" : "border-blue-500") + "bg-card"}>
        <Heart className="h-4 w-4" />
        <AlertTitle className="text-sm font-medium">{guidance.title}</AlertTitle>
        <AlertDescription className="text-xs mt-1">
          {guidance.message}
          <div className="mt-2 space-y-1">
            {guidance.resources.slice(0, 2).map((resource, index) => (
              <div key={index} className="text-xs">
                <strong>{resource.name}</strong>
                {resource.phone && <span> • {resource.phone}</span>}
                {resource.crisis && <Badge variant="destructive" className="ml-1 text-xs px-1 py-0">Crisis</Badge>}
              </div>
            ))}
            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
              View all resources →
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return <ResourcesContent guidance={guidance} />;
}
