import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, tool } from "ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CreateSimulationEventTemplateRequest } from "@/lib/supabase/types";
import { z } from "zod";

export const maxDuration = 30;

export const huggingface = createOpenAICompatible({
  name: "huggingface",
  apiKey: process.env.HF_API_KEY,
  baseURL: "https://router.huggingface.co/v1",
});

function isPlusActive(user: { is_plus: boolean; plus_expires_at: string | null } | null) {
  if (!user?.is_plus) return false;
  if (!user.plus_expires_at) return true;
  return new Date(user.plus_expires_at) > new Date();
}

export async function POST(req: Request) {
  // Get Clerk session
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json(
      { error: 'You must be signed in to use Pundit AI' },
      { status: 401 }
    );
  }

  const supabase = createSupabaseServerClient();
  
  if (!supabase) {
    return NextResponse.json(
      { error: 'Failed to initialize server client' },
      { status: 500 }
    );
  }

  // Get user's subscription status
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('is_plus, plus_expires_at')
    .eq('id', userId)
    .single();

  if (userError || !isPlusActive(userData)) {
    return NextResponse.json(
      { error: 'Hngr+ membership is required to access Pundit AI' },
      { status: 402 }
    );
  }

  try {
    const { messages } = await req.json();
    const result = streamText({
      model: huggingface("Qwen/Qwen2.5-72B-Instruct"),
      messages: await convertToModelMessages(messages),
      system: "You are Pundit AI, a creative assistant for designing survival games (akin to Hunger Games, do not mention) simulation events. When users ask you to create events, follow these guidelines:\n\n1. For single events: First use previewSimulationEventTemplate to show the user what you're planning to create. Wait for their approval before using createSimulationEventTemplate.\n\n2. For multiple related events: Use createMultipleSimulationEventTemplates when the user asks for several events at once or when you want to create a themed set of events.\n\n3. Always consider game balance, narrative variety, and appropriate tone. Each event should feel like it could happen in the hunger games universe.\n\n4. When creating previews, explain your reasoning for the event design and ask for user feedback before proceeding.",
      tools: {
        createSimulationEventTemplate: tool({
          description: "Create a new game event template for the survival game simulation. This defines what happens when tributes interact in the game.",
          inputSchema: z.object({
            title: z.string().describe("A descriptive title for the event (e.g., 'Deadly Arrow Shot', 'Alliance Formed')"),
            type: z.enum(['kill', 'kill2', 'alliance', 'find', 'feast', 'generic', 'training', 'combat']).describe("The event type: kill (single death), kill2 (double death), alliance (forming alliances), find (finding items), feast (eating), generic (miscellaneous), training (skill building), combat (fighting)"),
            roles: z.array(z.string()).describe("Array of role names used in the event (e.g., ['killer', 'victim'], ['tribute1', 'tribute2'])"),
            text_template: z.string().describe("The event text using {{role.attribute}} format. Use {{role.name}} for names, {{role.pronouns.possessive}} for possessive pronouns. Example: '{{killer.name}} kills {{victim.name}} with {{killer.pronouns.possessive}} spear.'"),
          }),
          execute: async ({ title, type, roles, text_template }) => {
            try {
              const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/simulation-events`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${userId}`,
                },
                body: JSON.stringify({
                  title,
                  type,
                  roles,
                  text_template,
                } as CreateSimulationEventTemplateRequest),
              });

              if (!response.ok) {
                const error = await response.json();
                return { success: false, error: error.error || 'Failed to create simulation event template' };
              }

              const data = await response.json();
              return { success: true, template: data.data };
            } catch (error) {
              return { success: false, error: 'Failed to create simulation event template' };
            }
          },
        }),
        previewSimulationEventTemplate: tool({
          description: "Preview a game event template before creating it. This allows the user to review the event before it's added to the simulation.",
          inputSchema: z.object({
            title: z.string().describe("A descriptive title for the event (e.g., 'Deadly Arrow Shot', 'Alliance Formed')"),
            type: z.enum(['kill', 'kill2', 'alliance', 'find', 'feast', 'generic', 'training', 'combat']).describe("The event type: kill (single death), kill2 (double death), alliance (forming alliances), find (finding items), feast (eating), generic (miscellaneous), training (skill building), combat (fighting)"),
            roles: z.array(z.string()).describe("Array of role names used in the event (e.g., ['killer', 'victim'], ['tribute1', 'tribute2'])"),
            text_template: z.string().describe("The event text using {{role.attribute}} format. Use {{role.name}} for names, {{role.pronouns.possessive}} for possessive pronouns. Example: '{{killer.name}} kills {{victim.name}} with {{killer.pronouns.possessive}} spear.'"),
          }),
          execute: async ({ title, type, roles, text_template }) => {
            return { 
              success: true, 
              preview: { title, type, roles, text_template },
              message: "Event preview generated. Please review before creating."
            };
          },
        }),
        createMultipleSimulationEventTemplates: tool({
          description: "Create multiple game event templates at once for the survival game simulation. Use this when you want to create several related events.",
          inputSchema: z.object({
            events: z.array(z.object({
              title: z.string().describe("A descriptive title for the event"),
              type: z.enum(['kill', 'kill2', 'alliance', 'find', 'feast', 'generic', 'training', 'combat']).describe("The event type"),
              roles: z.array(z.string()).describe("Array of role names used in the event"),
              text_template: z.string().describe("The event text using {{role.attribute}} format"),
            })).describe("Array of event templates to create"),
          }),
          execute: async ({ events }) => {
            try {
              const results = [];
              
              for (const event of events) {
                const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/simulation-events`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userId}`,
                  },
                  body: JSON.stringify(event as CreateSimulationEventTemplateRequest),
                });

                if (!response.ok) {
                  const error = await response.json();
                  results.push({ 
                    success: false, 
                    title: event.title, 
                    error: error.error || 'Failed to create simulation event template' 
                  });
                } else {
                  const data = await response.json();
                  results.push({ success: true, title: event.title, template: data.data });
                }
              }

              const successCount = results.filter(r => r.success).length;
              return { 
                success: successCount > 0, 
                results,
                message: `Created ${successCount} out of ${events.length} events successfully.`
              };
            } catch (error) {
              return { success: false, error: 'Failed to create simulation event templates' };
            }
          },
        }),
      },
    });
    
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error processing Pundit AI request:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}