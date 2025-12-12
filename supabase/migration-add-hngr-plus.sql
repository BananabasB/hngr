-- Add hngr+ membership fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_plus BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plus_expires_at TIMESTAMP WITH TIME ZONE;

-- Create simulation event templates (arena happenings) for hngr+ members
CREATE TABLE IF NOT EXISTS simulation_event_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('kill', 'kill2', 'alliance', 'find', 'feast', 'generic', 'training', 'combat')),
  roles JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of role definitions, e.g. ["killer","victim"]
  text_template TEXT NOT NULL, -- string with tokens such as {{killer.name}}
  effect_json JSONB DEFAULT '{"action":"none"}'::jsonb, -- future use (kill, heal, trust adjustments, etc.)
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','pending','rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for custom events
CREATE INDEX IF NOT EXISTS idx_sim_event_templates_creator_id ON simulation_event_templates(creator_id);
CREATE INDEX IF NOT EXISTS idx_sim_event_templates_status ON simulation_event_templates(status);

-- Enable RLS for new tables
ALTER TABLE simulation_event_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom events
CREATE POLICY "Anyone can view approved templates" ON simulation_event_templates
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Creators can view their own templates" ON simulation_event_templates
  FOR SELECT USING (auth.uid()::text = creator_id);

CREATE POLICY "Plus members can create templates" ON simulation_event_templates
  FOR INSERT WITH CHECK (
    auth.uid()::text = creator_id AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid()::text AND is_plus = true AND (plus_expires_at IS NULL OR plus_expires_at > NOW())
    )
  );

CREATE POLICY "Creators can update their own templates" ON simulation_event_templates
  FOR UPDATE USING (auth.uid()::text = creator_id);

CREATE POLICY "Creators can delete their own templates" ON simulation_event_templates
  FOR DELETE USING (auth.uid()::text = creator_id);

-- Add trigger for updated_at on simulation_event_templates
CREATE TRIGGER update_sim_event_templates_updated_at
  BEFORE UPDATE ON simulation_event_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
