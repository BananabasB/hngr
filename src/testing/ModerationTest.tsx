import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MentalHealthResources } from '@/components/mental-health-resources';
import { getLocationBasedResourcesClient } from '@/lib/mental-health-client';

interface ModerationResult {
  flagged: boolean;
  categories: {
    sexual: boolean;
    hate: boolean;
    harassment: boolean;
    'self-harm': boolean;
    'sexual/minors': boolean;
    'hate/threatening': boolean;
    'violence/graphic': boolean;
    'self-harm/intent': boolean;
    'self-harm/instructions': boolean;
    'harassment/threatening': boolean;
    violence: boolean;
  };
  category_scores: {
    sexual: number;
    hate: number;
    harassment: number;
    'self-harm': number;
    'sexual/minors': number;
    'hate/threatening': number;
    'violence/graphic': number;
    'self-harm/intent': number;
    'self-harm/instructions': number;
    'harassment/threatening': number;
    violence: number;
  };
  mentalHealthGuidance?: any;
}

export function ModerationTest() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<ModerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ukResources, setUkResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  const testSingleContent = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test-moderation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: input }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Moderation failed');
      }

      setResults(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Moderation failed');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const testNominationContent = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test-moderation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tributeName: input,
          tributeBio: `This is a bio for ${input}`,
          message: `I nominate ${input} because they're awesome!`
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Moderation failed');
      }

      setResults(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Moderation failed');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const testUkResources = async () => {
    setLoadingResources(true);
    try {
      const resources = await getLocationBasedResourcesClient('GB');
      setUkResources(resources);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load UK resources');
    } finally {
      setLoadingResources(false);
    }
  };

  const clearResults = () => {
    setResults(null);
    setError(null);
    setInput('');
    setUkResources([]);
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>OpenAI Moderation Test</CardTitle>
          <CardDescription>
            Test the content moderation system that prevents inappropriate nominations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Test Content</label>
            <Textarea
              placeholder="Enter text to test moderation (try offensive content to see it get flagged)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button onClick={testSingleContent} disabled={loading || !input.trim()}>
              Test Single Content
            </Button>
            <Button onClick={testNominationContent} disabled={loading || !input.trim()} variant="outline">
              Test Nomination Content
            </Button>
            <Button onClick={testUkResources} disabled={loadingResources} variant="outline">
              {loadingResources ? 'Loading UK Resources...' : 'Test UK Resources API'}
            </Button>
            <Button onClick={clearResults} variant="ghost">
              Clear
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${
                results.flagged
                  ? 'border-destructive bg-destructive/10'
                  : 'border-green-500 bg-green-50'
              }`}>
                <h3 className={`font-semibold ${
                  results.flagged ? 'text-destructive' : 'text-green-700'
                }`}>
                  {results.flagged ? '❌ Content Flagged' : '✅ Content Approved'}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Categories:</h4>
                  <div className="space-y-1 text-sm">
                    {Object.entries(results.categories).map(([category, flagged]) => (
                      <div key={category} className={`flex justify-between ${
                        flagged ? 'text-destructive font-medium' : 'text-muted-foreground'
                      }`}>
                        <span>{category.replace('_', ' ').replace('-', ' ')}</span>
                        <span>{flagged ? '❌' : '✅'}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Confidence Scores:</h4>
                  <div className="space-y-1 text-sm">
                    {Object.entries(results.category_scores)
                      .filter(([, score]) => score > 0)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([category, score]) => (
                        <div key={category} className="flex justify-between">
                          <span>{category.replace('_', ' ').replace('-', ' ')}</span>
                          <span className={score > 0.5 ? 'text-destructive font-medium' : ''}>
                            {(score * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {results && results.mentalHealthGuidance && (
            <MentalHealthResources guidance={results.mentalHealthGuidance} />
          )}

          {results?.flagged && !results?.mentalHealthGuidance && (
            <div className="text-sm text-muted-foreground">
              Note: Mental health guidance is fetched asynchronously via API routes and would be shown in the actual nomination flow.
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Note:</strong> This moderation system runs server-side via API routes:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Nomination creation (tribute name, bio, message) → <code>/api/nominations</code></li>
              <li>Report submissions (details field) → Server-side validation</li>
              <li>Testing interface → <code>/api/test-moderation</code></li>
            </ul>
            <p><strong>Free Moderation:</strong> Uses Google's Perspective API (free tier) for content moderation. No OpenAI costs required!</p>
            <p><strong>Content Moderation:</strong> Relies on AI-powered detection through Google's Perspective API to identify harmful content.</p>
            <p><strong>API-Powered Resources:</strong> When content is flagged, the system fetches current UK mental health resources from APIs like Befrienders Worldwide and shows them to users instead of just blocking content.</p>
            <p><strong>Mental Health Support:</strong> When content is flagged, users see relevant mental health resources and crisis hotlines to ensure they get help if needed.</p>
            <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
              <p><strong>💡 Try testing with:</strong></p>
              <ul className="list-disc list-inside ml-4">
                <li>"nazi" → Should be flagged as hate speech</li>
                <li>"I want to hurt myself" → Shows UK suicide prevention resources</li>
                <li>"Sexual assault" → Shows UK crisis support</li>
                <li>"I hate everyone" → Shows UK mental health support</li>
              </ul>
            </div>
          </div>

          {ukResources.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">UK Mental Health Resources (API Test):</h4>
              <div className="grid gap-2 max-h-60 overflow-y-auto">
                {ukResources.map((resource, index) => (
                  <div key={index} className="p-2 bg-muted rounded text-xs">
                    <div className="font-medium">{resource.name}</div>
                    <div className="text-muted-foreground">{resource.description}</div>
                    <div className="flex gap-2 mt-1">
                      {resource.contacts?.phone && <span>📞 {resource.contacts.phone}</span>}
                      {resource.contacts?.text && <span>💬 {resource.contacts.text}</span>}
                      {resource.contacts?.website && <span>🌐 {resource.contacts.website}</span>}
                      {resource.crisis && <span className="text-red-600">🚨 Crisis</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
