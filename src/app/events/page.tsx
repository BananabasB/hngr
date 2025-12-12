'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SimulationEventTemplate, SimulationEventType } from '@/lib/supabase/types';
import { Loader2, NotebookPen, Sparkles, Wand2, ShieldCheck, Plus } from 'lucide-react';
import { Gupter } from "next/font/google";
const gupter = Gupter({ weight: "400", subsets: ["latin"] });
const EVENT_TYPES: SimulationEventType[] = [
  'kill',
  'kill2',
  'alliance',
  'find',
  'feast',
  'generic',
  'training',
  'combat'
];

interface TemplatesResponse {
  data: SimulationEventTemplate[];
}

const defaultForm = {
  title: '',
  type: EVENT_TYPES[0],
  rolesInput: 'instigator,target',
  text_template: '{{instigator.name}} corners {{target.name}} near the river and spares them at the last second.',
};

export default function EventsPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<SimulationEventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isPlus = !!user?.is_plus;

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setError(null);
    try {
      const res = await fetch('/api/simulation-events?includeMine=true', {
        headers: {
          Authorization: user?.id ? `Bearer ${user.id}` : ''
        }
      });
      if (!res.ok) throw new Error('Failed to fetch arena events');
      const data: TemplatesResponse = await res.json();
      setTemplates(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load arena events');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const body = {
        title: form.title.trim(),
        type: form.type,
        roles: form.rolesInput
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean),
        text_template: form.text_template.trim(),
      };

      const res = await fetch('/api/simulation-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: user?.id ? `Bearer ${user.id}` : ''
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit template');
      }

      setSuccessMessage('Template added to the arena pool');
      setForm(defaultForm);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const approvedTemplates = useMemo(
    () => templates.filter((t) => t.status === 'approved'),
    [templates]
  );

  const myTemplates = useMemo(
    () => templates.filter((t) => t.creator_id === user?.id),
    [templates, user?.id]
  );

  const renderTemplateCard = (template: SimulationEventTemplate) => (
    <Card key={template.id} className="border border-border/60 bg-card/70 backdrop-blur">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {template.type}
          </Badge>
          {template.creator && (
            <Badge variant="outline" className="border-blue-400 text-blue-400 bg-blue-400/10">
              community
            </Badge>
          )}
        </div>
        <h3 className="text-xl font-semibold">{template.title}</h3>
        <p className="text-sm text-muted-foreground">
          Roles: {template.roles.join(', ')}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/40 p-4 text-sm leading-relaxed">
          {template.text_template}
        </div>
        {template.creator && (
          <div className="text-xs text-muted-foreground">
            Authored by {template.creator.display_name || template.creator.username || 'hngr+'}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Loading arena events...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-10">
      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-8 py-10 text-white shadow-2xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-300">arena director</p>
            <h1 className={`${gupter.className} text-5xl font-semibold leading-tight`}>
              create your own story.
            </h1>
            <p className="text-slate-200/80 max-w-2xl">
              hngr+ members can mint their own narrative beats—kills, alliances, oddball happenings—
              and the simulator will weave them directly into every shuffle.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 rounded-2xl border border-white/20 bg-white/5 p-4">
            <span className="text-sm uppercase tracking-widest text-slate-100">
              live library
            </span>
            <span className="text-3xl font-semibold">{approvedTemplates.length}</span>
            <span className="text-slate-200">active story beats</span>
          </div>
        </div>
      </section>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={fetchTemplates}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <section className="space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <h2 className="text-2xl font-semibold">featured arena events</h2>
        </div>
        {approvedTemplates.length === 0 ? (
          <Card className="border-dashed text-center py-12">
            <CardContent>
              <p className="text-muted-foreground">no templates yet. be the first to author one!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {approvedTemplates.map(renderTemplateCard)}
          </div>
        )}
      </section>

      <section className="space-y-6 rounded-3xl border border-border/60 bg-card p-8 shadow-inner">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-semibold">author a new happening</h2>
        </div>
        {!isPlus ? (
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center">
            <p className="text-lg font-medium text-primary mb-2">reserved for hngr+</p>
            <p className="text-muted-foreground mb-6">
              upgrade to hngr+ to inject your own storyline into the arena.
            </p>
            <Button asChild>
              <Link href="/pay/checkout">
                <Plus className="mr-2 h-4 w-4" /> become hngr+
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">title</label>
                <Input
                  placeholder="Example: Mercy near the river"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">event type</label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={form.type === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setForm((prev) => ({ ...prev, type }))}
                      className="capitalize"
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">roles (comma separated)</label>
                <Input
                  placeholder="instigator,target"
                  value={form.rolesInput}
                  onChange={(e) => setForm((prev) => ({ ...prev, rolesInput: e.target.value }))}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use lowercase identifiers. Refer to them in the script via{' '}
                  <code className="rounded bg-muted px-1 py-0.5 text-[11px]">{"{{role.property}}"}</code>.
                </p>
              </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">script</label>
                <Textarea
                  className="min-h-[220px]"
                  value={form.text_template}
                  onChange={(e) => setForm((prev) => ({ ...prev, text_template: e.target.value }))}
                  required
                />
              <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed">
                <p className="font-medium mb-1 text-foreground">tokens you can use:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    <code className="bg-background px-1 py-0.5">{"{{role.name}}"}</code> – tribute name
                  </li>
                  <li>
                    <code className="bg-background px-1 py-0.5">{"{{role.pronouns.subject}}"}</code> – pronoun pieces
                  </li>
                  <li>
                    <code className="bg-background px-1 py-0.5">{"{{role.district}}"}</code> – district number
                  </li>
                </ul>
              </div>
            </div>
            <div className="md:col-span-2 flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 text-sm">
              {successMessage && (
                <Alert className="border-green-500/40 bg-green-500/5 text-green-900">
                  <ShieldCheck className="h-4 w-4" />
                  <AlertTitle>submitted</AlertTitle>
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full md:w-auto" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    sending to arena
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    inject into simulator
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Templates become available immediately and are mixed with official events on the next
                shuffle. Keep it cinematic—story beats should run in a couple sentences.
              </p>
            </div>
          </form>
        )}
      </section>

      {myTemplates.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <NotebookPen className="h-5 w-5 text-purple-500" />
            <h2 className="text-2xl font-semibold">your submissions</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {myTemplates.map(renderTemplateCard)}
          </div>
        </section>
      )}
    </div>
  );
}
