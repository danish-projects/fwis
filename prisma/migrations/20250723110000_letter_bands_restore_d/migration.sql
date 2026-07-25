-- Letter grades A–D only (no F). Below 70% is D; pass threshold remains 70%.
UPDATE "grading_scale_config"
SET
  "letter_bands" = '[{"letter":"A","minPct":90},{"letter":"B","minPct":80},{"letter":"C","minPct":70},{"letter":"D","minPct":0}]'::jsonb,
  "pass_min_pct" = 70,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "id" = 'global';
