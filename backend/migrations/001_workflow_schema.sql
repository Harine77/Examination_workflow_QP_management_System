-- =============================================================
-- Migration 001: Extend workflow schema (FINAL FIXED VERSION)
-- Safe to run multiple times (idempotent)
-- =============================================================


-- ── 1. Extend Users role enum (SAFE CHECK) ────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_Users_role') THEN

    -- Add scrutinizer_1
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'scrutinizer_1'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_Users_role')
    ) THEN
      ALTER TYPE "enum_Users_role" ADD VALUE 'scrutinizer_1';
    END IF;

    -- Add scrutinizer_2
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'scrutinizer_2'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_Users_role')
    ) THEN
      ALTER TYPE "enum_Users_role" ADD VALUE 'scrutinizer_2';
    END IF;

  END IF;
END $$;


-- ── 2. Extend QuestionPapers status enum ──────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_QuestionPapers_status') THEN

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'with_scrutinizer1'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
    ) THEN
      ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'with_scrutinizer1';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'with_scrutinizer2'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
    ) THEN
      ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'with_scrutinizer2';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'needs_revision'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
    ) THEN
      ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'needs_revision';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'scrutinizer2_approved'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
    ) THEN
      ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'scrutinizer2_approved';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'randomized'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
    ) THEN
      ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'randomized';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'with_panel'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
    ) THEN
      ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'with_panel';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'with_hod'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
    ) THEN
      ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'with_hod';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumlabel = 'hod_approved'
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
    ) THEN
      ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'hod_approved';
    END IF;

  END IF;
END $$;


-- ── 3. Add workflow columns ───────────────────────────────────

ALTER TABLE "QuestionPapers"
  ADD COLUMN IF NOT EXISTS "scrutinizer1Comments" TEXT,
  ADD COLUMN IF NOT EXISTS "scrutinizer2Comments" TEXT,
  ADD COLUMN IF NOT EXISTS "scrutinizer1Id" INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "scrutinizer2Id" INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "panelMemberId" INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "revisionCount" INTEGER NOT NULL DEFAULT 0;


-- ── 4. Create question_reviews table ──────────────────────────

CREATE TABLE IF NOT EXISTS question_reviews (
  id SERIAL PRIMARY KEY,
  paper_id INTEGER NOT NULL REFERENCES "QuestionPapers"(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES "Questions"(id) ON DELETE CASCADE,
  reviewer_id INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
  reviewer_role VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL,
  suggestion_text TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT question_reviews_unique UNIQUE (paper_id, question_id, reviewer_role),
  CONSTRAINT question_reviews_status CHECK (status IN ('APPROVED', 'SUGGESTED'))
);

CREATE INDEX IF NOT EXISTS idx_qreviews_paper ON question_reviews (paper_id);