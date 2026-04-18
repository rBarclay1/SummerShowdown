-- Add isTotalLoad flag to Lift
-- Lifts where the logged weight represents total load (bodyweight + added weight),
-- e.g. weighted pull-ups. Defaults to false for all standard barbell/machine lifts.
ALTER TABLE "Lift" ADD COLUMN "isTotalLoad" BOOLEAN NOT NULL DEFAULT false;

-- Mark any existing total-load lifts by name (case-insensitive patterns)
UPDATE "Lift" SET "isTotalLoad" = true
WHERE lower("name") LIKE '%pull-up%'
   OR lower("name") LIKE '%pullup%'
   OR lower("name") LIKE '%chin-up%'
   OR lower("name") LIKE '%chinup%'
   OR lower("name") LIKE '%pull up%'
   OR lower("name") LIKE '%chin up%';
