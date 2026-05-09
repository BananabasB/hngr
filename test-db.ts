import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const client = createClient(supabaseUrl, supabaseAnonKey);

console.log("Checking connection...");
try {
  const { data, error } = await client.rpc('now');
  if (error) throw error;
  console.log("Success! Database time:", data);
} catch (err) {
  console.error("Connection failed:", err);
  process.exit(1);
}
