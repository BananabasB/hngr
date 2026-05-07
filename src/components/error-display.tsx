"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, RefreshCw, Copy } from "lucide-react";

interface GameCreationError {
  error: any;
  errorMessage: string;
  errorStack?: string;
  errorDetails: string;
  seasonId: string;
  hasDb: boolean;
  dbStateKeys: string[];
  tributesCount: number | string;
}

export function ErrorDisplay({ errors }: { errors: GameCreationError[] }) {
  const [copied, setCopied] = useState(false);

  if (errors.length === 0) return null;

  const latestError = errors[errors.length - 1];

  const copyErrorDetails = () => {
    const errorText = JSON.stringify(latestError, null, 2);
    navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed top-4 right-4 max-w-md z-50">
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertTitle className="text-red-800">Game Creation Failed</AlertTitle>
        <AlertDescription className="space-y-2">
          <div className="text-sm text-red-700">
            <strong>Error:</strong> {latestError.errorMessage}
          </div>
          
          <div className="text-xs space-y-1">
            <div><strong>Season ID:</strong> {latestError.seasonId}</div>
            <div><strong>Has Database:</strong> {latestError.hasDb ? 'Yes' : 'No'}</div>
            <div><strong>Tributes Count:</strong> {latestError.tributesCount}</div>
            <div><strong>Database Keys:</strong> {latestError.dbStateKeys.join(', ')}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <strong className="text-xs">Full Error Details:</strong>
              <Button
                size="sm"
                variant="outline"
                onClick={copyErrorDetails}
                className="h-6 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <Textarea
              value={latestError.errorDetails}
              readOnly
              className="text-xs font-mono h-32 resize-none"
              placeholder="Error details will appear here..."
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.location.reload()}
              className="text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reload Page
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function useErrorDisplay() {
  const [errors, setErrors] = useState<GameCreationError[]>([]);

  const addError = (error: GameCreationError) => {
    setErrors(prev => [...prev.slice(-2), error]); // Keep only last 3 errors
  };

  const clearErrors = () => {
    setErrors([]);
  };

  const ErrorComponent = () => <ErrorDisplay errors={errors} />;

  return { addError, clearErrors, ErrorComponent };
}
