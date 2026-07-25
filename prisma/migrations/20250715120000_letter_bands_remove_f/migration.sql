-- Letter grades A–D only: scores below 70% are D (F removed). Pass threshold remains 70%.
UPDATE "grading_scale_config"
SET
  "letter_bands" = '[{"letter":"A","minPct":90},{"letter":"B","minPct":80},{"letter":"C","minPct":70},{"letter":"D","minPct":0}]'::jsonb,
  "weights" = '{"attendance":0.1,"behavior":0.1,"QUIZ_1":0.05,"QUIZ_2":0.05,"QUIZ_3":0.05,"QUIZ_4":0.05,"QUIZ_5":0.05,"MIDTERM_PROJECT":0.1,"FINAL_EXAM":0.45}'::jsonb,
  "pass_min_pct" = 70,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'global';
