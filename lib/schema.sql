CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doc_type      text NOT NULL,
  period_start  date NOT NULL,
  period_end    date,
  source_path   text NOT NULL,
  content_hash  text NOT NULL,
  raw           jsonb,
  body_md       text,
  ingested_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doc_type, period_start)
);

CREATE TABLE IF NOT EXISTS activities (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id     bigint NOT NULL REFERENCES documents ON DELETE CASCADE,
  date            date NOT NULL,
  workstream      text NOT NULL,
  percent_energy  int,
  name            text NOT NULL,
  activity_type   text,
  description     text,
  estimated_hours numeric,
  impact          text,
  artifact        text,
  collaborators   text[] NOT NULL DEFAULT '{}',
  UNIQUE (date, workstream, name)
);
CREATE INDEX IF NOT EXISTS activities_collab_gin ON activities USING gin (collaborators);

CREATE TABLE IF NOT EXISTS notes (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  note_type   text NOT NULL DEFAULT 'thought',
  text        text NOT NULL,
  tags        text[] NOT NULL DEFAULT '{}',
  source      text
);

CREATE TABLE IF NOT EXISTS chunks (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id  bigint REFERENCES documents ON DELETE CASCADE,
  activity_id  bigint REFERENCES activities ON DELETE CASCADE,
  note_id      bigint REFERENCES notes ON DELETE CASCADE,
  chunk_type   text NOT NULL,
  source_type  text NOT NULL,          -- doc_type of parent document, or 'note'
  workstream   text,
  date         date NOT NULL,
  text         text NOT NULL,
  embedding    vector(1536),
  fts          tsvector GENERATED ALWAYS AS (to_tsvector('english', text)) STORED,
  metadata     jsonb,
  CHECK (document_id IS NOT NULL OR note_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS chunks_fts_gin ON chunks USING gin (fts);
CREATE INDEX IF NOT EXISTS chunks_date_idx ON chunks (date);

CREATE TABLE IF NOT EXISTS flags (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id  bigint NOT NULL REFERENCES documents ON DELETE CASCADE,
  date         date NOT NULL,
  flag         text NOT NULL,
  severity     text,
  note         text
);
