CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school TEXT NOT NULL,
  program TEXT NOT NULL,
  degree TEXT NOT NULL,
  season TEXT NOT NULL DEFAULT '2026 Fall',
  notify_email BOOLEAN DEFAULT true,
  notify_in_app BOOLEAN DEFAULT true,
  last_known_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, school, program, degree, season)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_user
  ON watchlist (user_id);

CREATE INDEX IF NOT EXISTS idx_watchlist_lookup
  ON watchlist (school, program, degree, season);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own watchlist"
  ON watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist"
  ON watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist"
  ON watchlist FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist"
  ON watchlist FOR DELETE
  USING (auth.uid() = user_id);
