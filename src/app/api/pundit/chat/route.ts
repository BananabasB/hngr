import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, tool } from "ai";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CreateSimulationEventTemplateRequest } from "@/lib/supabase/types";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';
import { isHngrPlusEnabled } from "@/lib/plus";

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

  if (isHngrPlusEnabled() && (userError || !isPlusActive(userData))) {
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
      system: "You are Pundit AI, a friendly and helpful assistant for managing the hngr survival games platform. You have comprehensive capabilities to help users manage the platform effectively.\n\n**Current Capabilities:**\n- Create and preview simulation event templates for survival games\n- Search and retrieve user information with beautiful profile displays\n- List and browse existing simulation events\n\n**Guidelines:**\n1. Be conversational and friendly - use phrases like \"Here you go!\" or \"Found some users for you!\"\n2. When users ask about events, use listSimulationEvents to show existing ones\n3. When users mention users, offer to search for them or get their info\n4. For event creation: use previewSimulationEventTemplate first, then createSimulationEventTemplate after approval\n5. Always explain what you're doing and why\n6. If you need more information, ask clarifying questions\n7. Note: Currently you can only create and list events - update/delete functionality will be available soon\n\n**Event Types:** kill (single death), kill2 (double death), alliance (forming alliances), find (finding items), feast (eating), generic (miscellaneous), training (skill building), combat (fighting)\n\nYou can help with platform management, user lookup with profile cards, event creation, and provide insights about the game system. Be proactive and suggest actions when appropriate!",
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
              // Direct internal API call - no HTTP needed
              const { createClient } = await import('@supabase/supabase-js');
              const { createSupabaseServerClient } = await import('@/lib/supabase/server');
              
              const supabase = createSupabaseServerClient();
              if (!supabase) {
                return { success: false, error: 'Database unavailable' };
              }

              const { data, error } = await supabase
                .from('simulation_event_templates')
                .insert({
                  title,
                  type,
                  roles,
                  text_template,
                  creator_id: userId,
                  status: 'pending'
                })
                .select()
                .single();

              if (error) {
                console.error('Create event error:', error);
                return { success: false, error: error.message || 'Failed to create simulation event template' };
              }

              return { success: true, template: data };
            } catch (error) {
              console.error('Create event error:', error);
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
              const { createSupabaseServerClient } = await import('@/lib/supabase/server');
              const supabase = createSupabaseServerClient();
              
              if (!supabase) {
                return { success: false, error: 'Database unavailable' };
              }

              const results = [];
              
              for (const event of events) {
                const { data, error } = await supabase
                  .from('simulation_event_templates')
                  .insert({
                    title: event.title,
                    type: event.type,
                    roles: event.roles,
                    text_template: event.text_template,
                    creator_id: userId,
                    status: 'pending'
                  })
                  .select()
                  .single();

                if (error) {
                  results.push({ 
                    success: false, 
                    title: event.title, 
                    error: error.message || 'Failed to create simulation event template' 
                  });
                } else {
                  results.push({ success: true, title: event.title, template: data });
                }
              }

              const successCount = results.filter(r => r.success).length;
              return { 
                success: successCount > 0, 
                results,
                message: `Created ${successCount} out of ${events.length} events successfully.`
              };
            } catch (error) {
              console.error('Create multiple events error:', error);
              return { success: false, error: 'Failed to create simulation event templates' };
            }
          },
        }),
        searchUsers: tool({
          description: "Search for users by username or display name",
          inputSchema: z.object({
            query: z.string().describe("Search query for username or display name"),
            limit: z.number().optional().default(10).describe("Maximum number of results to return"),
          }),
          execute: async ({ query, limit }) => {
            try {
              const { createClient } = await import('@supabase/supabase-js');
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
              const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
              const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false
                }
              });

              const { data, error } = await supabaseAdmin
                .from('users')
                .select('*')
                .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
                .limit(limit);

              if (error) {
                console.error('Search users error:', error);
                return { success: false, error: error.message || 'Failed to search users' };
              }

              return { 
                success: true, 
                users: data || [],
                count: data?.length || 0
              };
            } catch (error) {
              console.error('Search users error:', error);
              return { success: false, error: `Failed to search users: ${error instanceof Error ? error.message : 'Unknown error'}` };
            }
          },
        }),
        getUserInfo: tool({
          description: "Get detailed information about a specific user by their ID, username, or email",
          inputSchema: z.object({
            identifier: z.string().describe("User ID, username, or email address"),
          }),
          execute: async ({ identifier }) => {
            try {
              const { createClient } = await import('@supabase/supabase-js');
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
              const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
              const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
                auth: {
                  autoRefreshToken: false,
                  persistSession: false
                }
              });

              const { data, error } = await supabaseAdmin
                .from('users')
                .select('*')
                .or(`username.ilike.${identifier},email.eq.${identifier},id.eq.${identifier}`)
                .single();

              if (error) {
                if (error.code === 'PGRST116') {
                  return { success: false, error: 'User not found' };
                }
                console.error('Get user info error:', error);
                return { success: false, error: error.message || 'Failed to get user information' };
              }

              return { 
                success: true, 
                user: data
              };
            } catch (error) {
              console.error('Get user info error:', error);
              return { success: false, error: `Failed to get user information: ${error instanceof Error ? error.message : 'Unknown error'}` };
            }
          },
        }),
        listSimulationEvents: tool({
          description: "List existing simulation event templates",
          inputSchema: z.object({
            includeMine: z.boolean().optional().default(false).describe("Include events created by the current user"),
            limit: z.number().optional().default(20).describe("Maximum number of events to return"),
          }),
          execute: async ({ includeMine, limit }) => {
            try {
              const { createSupabaseServerClient } = await import('@/lib/supabase/server');
              const supabase = createSupabaseServerClient();
              
              if (!supabase) {
                return { success: false, error: 'Database unavailable' };
              }

              let query = supabase
                .from('simulation_event_templates')
                .select(`*, creator:users(id, username, display_name, avatar_url)`)
                .order('created_at', { ascending: false })
                .limit(limit);

              if (includeMine && userId) {
                query = query.or(`status.eq.approved,creator_id.eq.${userId}`);
              } else {
                query = query.eq('status', 'approved');
              }

              const { data, error } = await query;

              if (error) {
                console.error('List events error:', error);
                return { success: false, error: error.message || 'Failed to list simulation events' };
              }

              return { 
                success: true, 
                events: data || [],
                count: data?.length || 0
              };
            } catch (error) {
              console.error('List events error:', error);
              return { success: false, error: `Failed to list simulation events: ${error instanceof Error ? error.message : 'Unknown error'}` };
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
