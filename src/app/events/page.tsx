"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  SimulationEventTemplate,
  SimulationEventType,
  TemplateAttribute,
  TemplateConditionBlock,
  TemplateEffectBlock,
  TemplateOperand,
} from "@/lib/supabase/types";
import {
  Loader2,
  NotebookPen,
  Sparkles,
  Wand2,
  ShieldCheck,
  Plus,
  X,
  Trash2,
  KeyRound,
  LoaderPinwheel,
} from "lucide-react";
import { Gupter } from "next/font/google";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SignedOut, SignInButton } from "@clerk/nextjs";

const gupter = Gupter({ weight: "400", subsets: ["latin"] });
const EVENT_TYPES: SimulationEventType[] = [
  "kill",
  "kill2",
  "alliance",
  "find",
  "feast",
  "generic",
  "training",
  "combat",
];

interface TemplatesResponse {
  data: SimulationEventTemplate[];
}

type FormState = {
  title: string;
  type: SimulationEventType;
  roles: string[];
  text_template: string;
  criteria: TemplateConditionBlock[];
  effects: TemplateEffectBlock[];
};

const ATTRIBUTE_OPTIONS: { value: TemplateAttribute; label: string }[] = [
  { value: "health.physical", label: "Health · Physical" },
  { value: "health.mental", label: "Health · Mental" },
  { value: "food", label: "Food reserves" },
];

const COMPARISON_OPTIONS = [
  { value: ">", label: ">" },
  { value: ">=", label: "≥" },
  { value: "<", label: "<" },
  { value: "<=", label: "≤" },
  { value: "==", label: "=" },
  { value: "!=", label: "≠" },
];

const createDefaultForm = (): FormState => ({
  title: "",
  type: EVENT_TYPES[0],
  roles: ["instigator", "target"],
  text_template:
    "{{instigator.name}} corners {{target.name}} near the river and spares them at the last second.",
  criteria: [],
  effects: [],
});

export default function EventsPage() {
  const { user, loading: authLoading, isPlus } = useAuth();
  const [templates, setTemplates] = useState<SimulationEventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(createDefaultForm);
  const [roleDraft, setRoleDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [autoAllianceEffectId, setAutoAllianceEffectId] = useState<
    string | null
  >(null);

  const makeId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 9);

  const fetchTemplates = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/simulation-events?includeMine=true", {
        headers: {
          Authorization: user?.id ? `Bearer ${user.id}` : "",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch arena events");
      const data: TemplatesResponse = await res.json();
      setTemplates(data.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load arena events"
      );
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (isPlus) {
      fetchTemplates();
    } else {
      setLoading(false);
    }
  }, [authLoading, fetchTemplates, isPlus]);

  useEffect(() => {
    if (form.type === "alliance") {
      const lockedEffect =
        autoAllianceEffectId &&
        form.effects.find(
          (effect) =>
            effect.id === autoAllianceEffectId &&
            effect.action === "set_alliance"
        );
      if (lockedEffect) {
        return;
      }
      const existingSetAlliance = form.effects.find(
        (effect) => effect.action === "set_alliance"
      );
      if (existingSetAlliance) {
        setAutoAllianceEffectId(existingSetAlliance.id);
        return;
      }
      const defaultEffect = makeEffect("set_alliance");
      setForm((prev) => ({
        ...prev,
        effects: [...prev.effects, defaultEffect],
      }));
      setAutoAllianceEffectId(defaultEffect.id);
    } else if (autoAllianceEffectId) {
      setForm((prev) => ({
        ...prev,
        effects: prev.effects.filter(
          (effect) => effect.id !== autoAllianceEffectId
        ),
      }));
      setAutoAllianceEffectId(null);
    }
  }, [form.type, form.effects, autoAllianceEffectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const logicPayload =
        form.criteria.length || form.effects.length
          ? {
              criteria: form.criteria,
              effects: form.effects,
            }
          : null;

      const body = {
        title: form.title.trim(),
        type: form.type,
        roles: form.roles,
        text_template: form.text_template.trim(),
        effect_json: logicPayload,
      };

      const res = await fetch("/api/simulation-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: user?.id ? `Bearer ${user.id}` : "",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit template");
      }

      setSuccessMessage("Template added to the arena pool");
      setForm(createDefaultForm());
      setRoleDraft("");
      setAutoAllianceEffectId(null);
      await fetchTemplates();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const approvedTemplates = useMemo(
    () => templates.filter((t) => t.status === "approved"),
    [templates]
  );

  const myTemplates = useMemo(
    () => templates.filter((t) => t.creator_id === user?.id),
    [templates, user?.id]
  );

  const detectedTokens = useMemo(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const matches: {
      raw: string;
      role: string;
      prop: string;
      validRole: boolean;
    }[] = [];
    let match;
    while ((match = regex.exec(form.text_template))) {
      const raw = match[0];
      const inner = match[1].trim();
      const [role, ...propParts] = inner.split(".");
      const roleId = role?.trim() || "";
      const prop = propParts.join(".") || "name";
      matches.push({
        raw,
        role: roleId,
        prop,
        validRole: form.roles.includes(roleId),
      });
    }
    return matches;
  }, [form.text_template, form.roles]);

  const isRoleAttributeOperand = (
    operand: TemplateOperand
  ): operand is Extract<TemplateOperand, { kind: "role_attribute" }> =>
    operand.kind === "role_attribute";

  const handleAddRole = () => {
    const cleaned = roleDraft.trim().toLowerCase();
    if (!cleaned) return;
    if (form.roles.includes(cleaned)) {
      setRoleDraft("");
      return;
    }
    setForm((prev) => ({ ...prev, roles: [...prev.roles, cleaned] }));
    setRoleDraft("");
  };

  const handleRoleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddRole();
    }
  };

  const removeRole = (role: string) => {
    setForm((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r !== role),
      criteria: prev.criteria.filter((condition) => {
        const leftHit =
          condition.left.kind === "role_attribute" &&
          condition.left.role === role;
        const rightHit =
          condition.right.kind === "role_attribute" &&
          condition.right.role === role;
        return !leftHit && !rightHit;
      }),
      effects: prev.effects.filter((effect) => {
        if (effect.action === "kill" || effect.action === "adjust_food") {
          return effect.targetRole !== role;
        }
        if (effect.action === "adjust_health") {
          return effect.targetRole !== role;
        }
        if (effect.action === "adjust_trust") {
          return effect.sourceRole !== role && effect.targetRole !== role;
        }
        if (effect.action === "set_alliance") {
          return effect.roleA !== role && effect.roleB !== role;
        }
        return true;
      }),
    }));
  };

  const addCondition = () => {
    const defaultRole = form.roles[0] ?? "tribute";
    const newCondition: TemplateConditionBlock = {
      id: makeId(),
      left: {
        kind: "role_attribute",
        role: defaultRole,
        attribute: "health.physical",
      },
      operator: ">",
      right: { kind: "number", value: 50 },
    };
    setForm((prev) => ({
      ...prev,
      criteria: [...prev.criteria, newCondition],
    }));
  };

  const updateCondition = (
    id: string,
    updater: (condition: TemplateConditionBlock) => TemplateConditionBlock
  ) => {
    setForm((prev) => ({
      ...prev,
      criteria: prev.criteria.map((condition) =>
        condition.id === id ? updater(condition) : condition
      ),
    }));
  };

  const removeCondition = (id: string) => {
    setForm((prev) => ({
      ...prev,
      criteria: prev.criteria.filter((condition) => condition.id !== id),
    }));
  };

  const makeEffect = (
    action: TemplateEffectBlock["action"]
  ): TemplateEffectBlock => {
    const defaultRole = form.roles[0] ?? "tribute";
    const secondaryRole = form.roles[1] ?? defaultRole;
    switch (action) {
      case "kill":
        return { id: makeId(), action: "kill", targetRole: defaultRole };
      case "adjust_health":
        return {
          id: makeId(),
          action: "adjust_health",
          targetRole: defaultRole,
          attribute: "health.physical",
          delta: -5,
        };
      case "adjust_food":
        return {
          id: makeId(),
          action: "adjust_food",
          targetRole: defaultRole,
          delta: 1,
        };
      case "adjust_trust":
        return {
          id: makeId(),
          action: "adjust_trust",
          sourceRole: defaultRole,
          targetRole: secondaryRole,
          delta: 5,
        };
      case "set_alliance":
        return {
          id: makeId(),
          action: "set_alliance",
          roleA: defaultRole,
          roleB: secondaryRole,
          allied: true,
        };
      default:
        return { id: makeId(), action: "kill", targetRole: defaultRole };
    }
  };

  const addEffect = () => {
    setForm((prev) => ({
      ...prev,
      effects: [...prev.effects, makeEffect("adjust_health")],
    }));
  };

  const updateEffect = (
    id: string,
    updater: (effect: TemplateEffectBlock) => TemplateEffectBlock
  ) => {
    setForm((prev) => ({
      ...prev,
      effects: prev.effects.map((effect) =>
        effect.id === id ? updater(effect) : effect
      ),
    }));
  };

  const replaceEffectAction = (
    id: string,
    action: TemplateEffectBlock["action"]
  ) => {
    if (form.type === "alliance" && id === autoAllianceEffectId) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      effects: prev.effects.map((effect) =>
        effect.id === id ? makeEffect(action) : effect
      ),
    }));
  };

  const removeEffect = (id: string) => {
    if (form.type === "alliance" && id === autoAllianceEffectId) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      effects: prev.effects.filter((effect) => effect.id !== id),
    }));
  };

  const renderTemplateCard = (template: SimulationEventTemplate) => (
    <Card
      key={template.id}
      className="border border-border/60 bg-card/70 backdrop-blur"
    >
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize">
            {template.type}
          </Badge>
          {template.creator && (
            <Badge
              variant="outline"
              className="border-blue-400 text-blue-400 bg-blue-400/10"
            >
              community
            </Badge>
          )}
        </div>
        <h3 className="text-xl font-semibold">{template.title}</h3>
        <p className="text-sm text-muted-foreground">
          Roles: {template.roles.join(", ")}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg bg-muted/40 p-4 text-sm leading-relaxed">
          {template.text_template}
        </div>
        {template.creator && (
          <div className="text-xs text-muted-foreground">
            Authored by{" "}
            {template.creator.display_name ||
              template.creator.username ||
              "hngr+"}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (authLoading || (isPlus && loading)) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <LoaderPinwheel className="mx-auto h-7 w-7 animate-spin" />
        <p className="mt-4">
          {authLoading
            ? "Checking membership status..."
            : "Loading arena events..."}
        </p>
      </div>
    );
  }

  if (!isPlus) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="mx-auto max-w-2xl border-dashed border-primary/40 bg-card/80 text-center">
          <CardHeader>
            <h2 className="text-3xl font-semibold">hngr+ required</h2>
            <p className="text-muted-foreground">
              you gotta have hngr+ to use this tab. upgrade to unlock arena
              events.
            </p>
          </CardHeader>
          <CardContent className="flex gap-2 flex-col justify-center">
            <Button asChild>
              <Link href="/pay/checkout">
                <Plus className="mr-2 h-4 w-4" />
                upgrade to hngr+
              </Link>
            </Button>

            <SignedOut>
              <SignInButton>
                <Button
                  className={`justify-center rounded-md py-2 px-4 font-medium transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50`}
                  variant={"outline"}
                  aria-label="authenticate"
                >
                  <KeyRound className={"h-5 w-5"} />
                  log in
                </Button>
              </SignInButton>
            </SignedOut>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-10">
      <section className="rounded-3xl border border-border/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-8 py-10 text-white shadow-2xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-300">
              arena director
            </p>
            <h1
              className={`${gupter.className} text-5xl font-semibold leading-tight`}
            >
              create your own story.
            </h1>
            <p className="text-slate-200/80 max-w-2xl">
              hngr+ members can mint their own narrative beats—kills, alliances,
              oddball happenings— and the simulator will weave them directly
              into every shuffle.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 rounded-2xl border border-white/20 bg-white/5 p-4">
            <span className="text-sm uppercase tracking-widest text-slate-100">
              live library
            </span>
            <span className="text-3xl font-semibold">
              {approvedTemplates.length}
            </span>
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
              <p className="text-muted-foreground">
                no templates yet. be the first to author one!
              </p>
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
            <p className="text-lg font-medium text-primary mb-2">
              reserved for hngr+
            </p>
            <p className="text-muted-foreground mb-6">
              upgrade to hngr+ to inject your own storyline into the arena.
            </p>
            <Button asChild>
              <Link href="/pay/checkout">
                <Plus className="mr-2 h-4 w-4" /> get hngr+
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
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, title: e.target.value }))
                  }
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
                      variant={form.type === type ? "default" : "outline"}
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
                <label className="text-sm font-medium">roles</label>
                <div className="flex flex-wrap gap-2">
                  {form.roles.map((role) => (
                    <span
                      key={role}
                      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-sm"
                    >
                      {role}
                      <button
                        type="button"
                        onClick={() => removeRole(role)}
                        className="rounded-full p-0.5 text-muted-foreground transition hover:text-foreground"
                        aria-label={`remove ${role}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {form.roles.length === 0 && (
                    <span className="text-xs text-muted-foreground">
                      add at least one role
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="instigator"
                    value={roleDraft}
                    onChange={(e) => setRoleDraft(e.target.value)}
                    onKeyDown={handleRoleKeyDown}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAddRole}
                  >
                    add role
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Press{" "}
                  <kbd className="rounded border px-1 text-[11px]">Enter</kbd>{" "}
                  or click “add role” to append. Use lowercase names; reference
                  them in the script via{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                    {"{{role.property}}"}
                  </code>
                  .
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">script</label>
              <Textarea
                className="min-h-[220px]"
                value={form.text_template}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    text_template: e.target.value,
                  }))
                }
                required
              />
              <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed space-y-2">
                <p className="font-medium text-foreground">detected tokens</p>
                {detectedTokens.length === 0 ? (
                  <p className="text-muted-foreground">
                    No variables detected yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {detectedTokens.map((token, idx) => (
                      <Badge
                        key={`${token.raw}-${idx}`}
                        variant={token.validRole ? "secondary" : "destructive"}
                        className="text-[11px]"
                      >
                        {token.raw}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-muted-foreground">
                  Use{" "}
                  <code className="bg-background px-1 py-0.5">
                    {
                      "{{role.name}} / {{role.pronouns.subject}} / {{role.health.physical}}"
                    }
                  </code>{" "}
                  etc. Tokens turn red if the referenced role isn’t in your
                  list.
                </p>
              </div>
            </div>
            <div className="md:col-span-2 space-y-6">
              <div className="space-y-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide">
                      criteria
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Optional guards that must pass before this event can
                      trigger.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCondition}
                  >
                    add condition
                  </Button>
                </div>
                {form.criteria.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No criteria added.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {form.criteria.map((condition) => {
                      const rightRoleOperand = isRoleAttributeOperand(
                        condition.right
                      )
                        ? condition.right
                        : null;
                      const leftRoleOperand = isRoleAttributeOperand(
                        condition.left
                      )
                        ? condition.left
                        : null;
                      return (
                        <div
                          key={condition.id}
                          className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-3"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                              <span>if</span>
                              <Switch
                                checked={Boolean(condition.negate)}
                                onCheckedChange={(checked) =>
                                  updateCondition(condition.id, (prev) => ({
                                    ...prev,
                                    negate: checked,
                                  }))
                                }
                                className="data-[state=checked]:bg-destructive"
                              />
                              <span>not?</span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="remove condition"
                              onClick={() => removeCondition(condition.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="grid gap-3 md:grid-cols-4 md:[&>*]:min-w-0">
                            <div className="space-y-2">
                              <Label className="text-xs uppercase text-muted-foreground">
                                role
                              </Label>
                              <Select
                                value={leftRoleOperand?.role ?? form.roles[0]}
                                onValueChange={(value) =>
                                  updateCondition(condition.id, (prev) => ({
                                    ...prev,
                                    left: {
                                      kind: "role_attribute",
                                      role: value,
                                      attribute:
                                        prev.left.kind === "role_attribute"
                                          ? prev.left.attribute
                                          : "health.physical",
                                    },
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {form.roles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase text-muted-foreground">
                                attribute
                              </Label>
                              <Select
                                value={
                                  leftRoleOperand?.attribute ??
                                  ATTRIBUTE_OPTIONS[0].value
                                }
                                onValueChange={(value) =>
                                  updateCondition(condition.id, (prev) => ({
                                    ...prev,
                                    left: {
                                      kind: "role_attribute",
                                      role:
                                        prev.left.kind === "role_attribute"
                                          ? prev.left.role
                                          : form.roles[0],
                                      attribute: value as TemplateAttribute,
                                    },
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="attribute" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ATTRIBUTE_OPTIONS.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase text-muted-foreground">
                                operator
                              </Label>
                              <Select
                                value={condition.operator}
                                onValueChange={(value) =>
                                  updateCondition(condition.id, (prev) => ({
                                    ...prev,
                                    operator:
                                      value as TemplateConditionBlock["operator"],
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="operator" />
                                </SelectTrigger>
                                <SelectContent>
                                  {COMPARISON_OPTIONS.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs uppercase text-muted-foreground">
                                compare to
                              </Label>
                              <Select
                                value={rightRoleOperand ? "role" : "number"}
                                onValueChange={(type) =>
                                  updateCondition(condition.id, (prev) => ({
                                    ...prev,
                                    right:
                                      type === "number"
                                        ? {
                                            kind: "number",
                                            value:
                                              prev.right.kind === "number"
                                                ? prev.right.value
                                                : 0,
                                          }
                                        : {
                                            kind: "role_attribute",
                                            role: form.roles[0] ?? "tribute",
                                            attribute: "health.physical",
                                          },
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="number">Number</SelectItem>
                                  <SelectItem value="role">
                                    Role attribute
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              {rightRoleOperand ? (
                                <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
                                  <Select
                                    value={rightRoleOperand.role}
                                    onValueChange={(value) =>
                                      updateCondition(condition.id, (prev) => ({
                                        ...prev,
                                        right: {
                                          kind: "role_attribute",
                                          role: value,
                                          attribute:
                                            prev.right.kind === "role_attribute"
                                              ? prev.right.attribute
                                              : "health.physical",
                                        },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {form.roles.map((role) => (
                                        <SelectItem key={role} value={role}>
                                          {role}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Select
                                    value={rightRoleOperand.attribute}
                                    onValueChange={(value) =>
                                      updateCondition(condition.id, (prev) => ({
                                        ...prev,
                                        right: {
                                          kind: "role_attribute",
                                          role:
                                            prev.right.kind === "role_attribute"
                                              ? prev.right.role
                                              : form.roles[0] ?? "tribute",
                                          attribute: value as TemplateAttribute,
                                        },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="attr" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ATTRIBUTE_OPTIONS.map((option) => (
                                        <SelectItem
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <Input
                                  type="number"
                                  value={
                                    condition.right.kind === "number"
                                      ? condition.right.value
                                      : 0
                                  }
                                  onChange={(e) =>
                                    updateCondition(condition.id, (prev) => ({
                                      ...prev,
                                      right: {
                                        kind: "number",
                                        value: Number(e.target.value),
                                      },
                                    }))
                                  }
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-2xl border border-border/60 bg-background/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide">
                      effects
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Define what happens when the event fires—injuries, food
                      drops, alliances, etc.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addEffect()}
                    disabled={form.roles.length === 0}
                  >
                    add effect
                  </Button>
                </div>
                {form.roles.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Add at least one role to configure effects.
                  </p>
                )}
                {form.effects.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No effects added.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {form.effects.map((effect) => (
                      <div
                        key={effect.id}
                        className="space-y-3 rounded-xl border border-border/60 bg-card/60 p-3"
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="min-w-[200px] flex-1 md:flex-none">
                            <Select
                              value={effect.action}
                              onValueChange={(value) =>
                                replaceEffectAction(
                                  effect.id,
                                  value as TemplateEffectBlock["action"]
                                )
                              }
                            >
                              <SelectTrigger className="w-full capitalize">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kill">
                                  Kill target
                                </SelectItem>
                                <SelectItem value="adjust_health">
                                  Adjust health
                                </SelectItem>
                                <SelectItem value="adjust_food">
                                  Adjust food
                                </SelectItem>
                                <SelectItem value="adjust_trust">
                                  Adjust trust
                                </SelectItem>
                                <SelectItem value="set_alliance">
                                  Set alliance
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="remove effect"
                            onClick={() => removeEffect(effect.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {effect.action === "kill" && (
                          <div className="grid gap-2 md:grid-cols-2 md:[&>*]:min-w-0">
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                target role
                              </Label>
                              <Select
                                value={effect.targetRole}
                                onValueChange={(value) =>
                                  updateEffect(effect.id, (prev) => ({
                                    ...prev,
                                    targetRole: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {form.roles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {effect.action === "adjust_health" && (
                          <div className="grid gap-2 md:grid-cols-3 md:[&>*]:min-w-0">
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                role
                              </Label>
                              <Select
                                value={effect.targetRole}
                                onValueChange={(value) =>
                                  updateEffect(effect.id, (prev) => ({
                                    ...prev,
                                    targetRole: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {form.roles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                attribute
                              </Label>
                              <Select
                                value={effect.attribute}
                                onValueChange={(value) =>
                                  updateEffect(effect.id, (prev) => ({
                                    ...prev,
                                    attribute: value as Exclude<
                                      TemplateAttribute,
                                      "food"
                                    >,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ATTRIBUTE_OPTIONS.filter(
                                    (attr) => attr.value !== "food"
                                  ).map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                delta
                              </Label>
                              <Input
                                type="number"
                                value={effect.delta}
                                onChange={(e) =>
                                  updateEffect(effect.id, (prev) => ({
                                    ...prev,
                                    delta: Number(e.target.value),
                                  }))
                                }
                              />
                            </div>
                          </div>
                        )}

                        {effect.action === "adjust_food" && (
                          <div className="grid gap-2 md:grid-cols-2 md:[&>*]:min-w-0">
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                role
                              </Label>
                              <Select
                                value={effect.targetRole}
                                onValueChange={(value) =>
                                  updateEffect(effect.id, (prev) => ({
                                    ...prev,
                                    targetRole: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {form.roles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                delta
                              </Label>
                              <Input
                                type="number"
                                value={effect.delta}
                                onChange={(e) =>
                                  updateEffect(effect.id, (prev) => ({
                                    ...prev,
                                    delta: Number(e.target.value),
                                  }))
                                }
                              />
                            </div>
                          </div>
                        )}

                        {effect.action === "adjust_trust" && (
                          <div className="grid gap-2 md:grid-cols-3 md:[&>*]:min-w-0">
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                source role
                              </Label>
                              <Select
                                value={effect.sourceRole}
                                onValueChange={(value) =>
                                  updateEffect(effect.id, (prev) => ({
                                    ...prev,
                                    sourceRole: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {form.roles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                target role
                              </Label>
                              <Select
                                value={effect.targetRole}
                                onValueChange={(value) =>
                                  updateEffect(effect.id, (prev) => ({
                                    ...prev,
                                    targetRole: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {form.roles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                delta
                              </Label>
                              <Input
                                type="number"
                                value={effect.delta}
                                onChange={(e) =>
                                  updateEffect(effect.id, (prev) => ({
                                    ...prev,
                                    delta: Number(e.target.value),
                                  }))
                                }
                              />
                            </div>
                          </div>
                        )}

                        {effect.action === "set_alliance" && (
                          <div className="grid gap-2 md:grid-cols-3 md:[&>*]:min-w-0">
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                role a
                              </Label>
                              <Select
                                value={effect.roleA}
                                onValueChange={(value) =>
                                  updateEffect(effect.id, (prev) => ({
                                    ...prev,
                                    roleA: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {form.roles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                role b
                              </Label>
                              <Select
                                value={effect.roleB}
                                onValueChange={(value) =>
                                  updateEffect(effect.id, (prev) => ({
                                    ...prev,
                                    roleB: value,
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {form.roles.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs uppercase text-muted-foreground">
                                allied?
                              </Label>
                              <div className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2">
                                <Switch
                                  checked={effect.allied}
                                  onCheckedChange={(checked) =>
                                    updateEffect(effect.id, (prev) => ({
                                      ...prev,
                                      allied: checked,
                                    }))
                                  }
                                />
                                <span className="text-xs text-muted-foreground">
                                  {effect.allied
                                    ? "form alliance"
                                    : "break alliance"}
                                </span>
                              </div>
                            </div>
                            <div className="md:col-span-3 space-y-1 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                alliance outcome
                              </p>
                              {effect.roleA && effect.roleB ? (
                                <p className="text-xs text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    {effect.roleA}
                                  </span>{" "}
                                  {effect.allied
                                    ? "will ally with"
                                    : "will break alliance with"}{" "}
                                  <span className="font-medium text-foreground">
                                    {effect.roleB}
                                  </span>
                                  .
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">
                                  Choose both roles to show how the alliance
                                  will change.
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
              <Button
                type="submit"
                className="w-full md:w-auto"
                disabled={submitting}
              >
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
                Templates become available immediately and are mixed with
                official events on the next shuffle. Keep it cinematic—story
                beats should run in a couple sentences.
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
