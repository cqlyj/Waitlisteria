CREATE TABLE IF NOT EXISTS results_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school TEXT NOT NULL,
  program TEXT NOT NULL,
  degree TEXT NOT NULL,
  season TEXT NOT NULL DEFAULT '2026 Fall',
  data JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school, program, degree, season)
);

CREATE INDEX IF NOT EXISTS idx_results_cache_lookup
  ON results_cache (school, program, degree, season);
