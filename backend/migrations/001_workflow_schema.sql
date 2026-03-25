-- =============================================================
-- Migration 001: Extend workflow schema
-- Safe to run multiple times (all statements are idempotent).
--
-- Run once:
--   psql -U postgres -d <your_db_name> -f migrations/001_workflow_schema.sql
--
-- This migration:
--   1. Adds scrutinizer_1 and scrutinizer_2 to the Users role enum
--   2. Adds all workflow stage values to the QuestionPapers status enum
--   3. Adds new columns to QuestionPapers for tracking each stage
--   4. Creates the question_reviews table for per-question review tracking
-- =============================================================


-- ── 1. Extend Users role enum ────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'scrutinizer_1'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_Users_role')
  ) THEN
    ALTER TYPE "enum_Users_role" ADD VALUE 'scrutinizer_1';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'scrutinizer_2'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_Users_role')
  ) THEN
    ALTER TYPE "enum_Users_role" ADD VALUE 'scrutinizer_2';
  END IF;
END $$;


-- ── 2. Extend QuestionPapers status enum ─────────────────────────────────────
--
-- Workflow stages:
--   draft               → faculty creating / editing
--   with_scrutinizer1   → faculty submitted → waiting for Scrutinizer 1
--   with_scrutinizer2   → Scrutinizer 1 passed it → waiting for Scrutinizer 2
--   needs_revision      → Scrutinizer 2 rejected → back to faculty
--   scrutinizer2_approved → Scrutinizer 2 approved this individual paper
--   randomized          → One of 3 approved papers was selected as the final paper
--   with_panel          → Final paper sent to Panel Member
--   with_hod            → Panel Member reviewed → waiting for HOD
--   hod_approved        → HOD gave final approval (done)
--
-- Legacy values kept for backward compatibility:
--   submitted, reviewed, finalized

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'with_scrutinizer1'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
  ) THEN
    ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'with_scrutinizer1';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'with_scrutinizer2'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
  ) THEN
    ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'with_scrutinizer2';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'needs_revision'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
  ) THEN
    ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'needs_revision';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'scrutinizer2_approved'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
  ) THEN
    ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'scrutinizer2_approved';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'randomized'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
  ) THEN
    ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'randomized';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'with_panel'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
  ) THEN
    ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'with_panel';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'with_hod'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
  ) THEN
    ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'with_hod';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'hod_approved'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_QuestionPapers_status')
  ) THEN
    ALTER TYPE "enum_QuestionPapers_status" ADD VALUE 'hod_approved';
  END IF;
END $$;


-- ── 3. Add new workflow-tracking columns to QuestionPapers ───────────────────

ALTER TABLE "QuestionPapers"
  ADD COLUMN IF NOT EXISTS "scrutinizer1Comments" TEXT,
  ADD COLUMN IF NOT EXISTS "scrutinizer2Comments" TEXT,
  ADD COLUMN IF NOT EXISTS "scrutinizer1Id"       INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "scrutinizer2Id"       INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "panelMemberId"        INTEGER REFERENCES "Users"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "revisionCount"        INTEGER NOT NULL DEFAULT 0;


-- ── 4. Create question_reviews table ─────────────────────────────────────────
-- Stores per-question review decisions from Scrutinizer 1 and Scrutinizer 2.
-- paper_id + question_id + reviewer_role must be unique so each scrutinizer
-- can have their own independent review of the same question.

CREATE TABLE IF NOT EXISTS question_reviews (
  id              SERIAL PRIMARY KEY,
  paper_id        INTEGER NOT NULL REFERENCES "QuestionPapers"(id) ON DELETE CASCADE,
  question_id     INTEGER NOT NULL REFERENCES "Questions"(id)      ON DELETE CASCADE,
  reviewer_id     INTEGER          REFERENCES "Users"(id)          ON DELETE SET NULL,
  reviewer_role   VARCHAR(30)  NOT NULL,
  status          VARCHAR(20)  NOT NULL,
  suggestion_text TEXT,
  reviewed_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT question_reviews_unique UNIQUE (paper_id, question_id, reviewer_role),
  CONSTRAINT question_reviews_status CHECK (status IN ('APPROVED', 'SUGGESTED'))
);

-- Index for fast look-ups by paper
CREATE INDEX IF NOT EXISTS idx_qreviews_paper ON question_reviews (paper_id);
