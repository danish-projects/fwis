-- Global grading scale configuration (singleton row)
CREATE TABLE "grading_scale_config" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "weights" JSONB NOT NULL,
    "letter_bands" JSONB NOT NULL,
    "pass_min_pct" DECIMAL(5,2) NOT NULL DEFAULT 60,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" UUID,

    CONSTRAINT "grading_scale_config_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "grading_scale_config" ADD CONSTRAINT "grading_scale_config_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "grading_scale_config" ("id", "weights", "letter_bands", "pass_min_pct", "updated_at")
VALUES (
  'global',
  '{"attendance":0.1,"behavior":0.1,"QUIZ_1":0.05,"QUIZ_2":0.05,"QUIZ_3":0.05,"QUIZ_4":0.05,"QUIZ_5":0.05,"MIDTERM_PROJECT":0.15,"FINAL_EXAM":0.4}',
  '[{"letter":"A","minPct":90},{"letter":"B","minPct":80},{"letter":"C","minPct":70},{"letter":"D","minPct":60},{"letter":"F","minPct":0}]',
  60,
  CURRENT_TIMESTAMP
);
