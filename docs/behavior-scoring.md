# Behavior Scoring System

This document explains how FWIS calculates student behavior scores for report cards, transcripts, and dashboards.

## Purpose

Behavior scoring gives teachers a simple way to record weekly conduct on attendance days and turns those ratings into a fair, transparent percentage that contributes **10%** toward each student's final report card grade.

The system is designed to be:

- **Simple** — six clear rating levels, no manual numeric entry
- **Transparent** — parents and administrators can see how the score was calculated
- **Fair** — every student starts at **Meets Expectations (85)**; ratings adjust from there

## Base Score: Why 85?

Every student begins the academic year with a **base behavior score of 85**, which represents **Meets Expectations**.

This means:

- A student with **no behavior ratings** still receives **85%** — never zero
- Teachers record adjustments only when they mark attendance for a Sunday session
- The base score reflects a neutral, positive starting assumption: students are expected to meet school behavior standards unless noted otherwise

## Weekly Behavior Ratings

Teachers select **one overall behavior rating per student per attendance date** (Sunday session). Ratings and their score adjustments:

| Rating             | Adjustment |
| ------------------ | ---------: |
| Outstanding        |         +3 |
| Excellent          |         +2 |
| Very Good          |         +1 |
| Meets Expectations |          0 |
| Needs Improvement  |         -2 |
| Unsatisfactory     |         -5 |

Ratings are stored in the database as codes (`OUTSTANDING`, `EXCELLENT`, etc.). The adjustment is **always calculated in application code**, never stored in the database.

## Calculation Formula

```
Behavior Score = Base Score + Sum(All Weekly Adjustments)
Base Score = 85

Final score is clamped between 0 and 100:
score = min(100, max(0, 85 + adjustments))
```

### Example 1 — Several weeks recorded

| Week | Rating             | Adjustment |
| ---- | ------------------ | ---------: |
| 1    | Excellent          |         +2 |
| 2    | Meets Expectations |          0 |
| 3    | Outstanding        |         +3 |
| 4    | Needs Improvement  |         -2 |

```
85 + 2 + 0 + 3 + (-2) = 88
```

**Final Behavior Score: 88%** — Level: **Very Good**

### Example 2 — No behavior records

```
85 + 0 = 85
```

**Final Behavior Score: 85%** — Level: **Meets Expectations**

### Example 3 — Multiple low ratings (clamped)

```
85 + (-5) + (-5) + (-5) + (-5) + (-5) = 60
```

**Final Behavior Score: 60%** — Level: **Needs Improvement**

If adjustments would push the score below 0, the result is clamped to **0**.

## Behavior Level (Display Label)

The calculated score maps to a parent-friendly level:

| Score Range | Level              |
| ----------- | ------------------ |
| 94–100      | Outstanding        |
| 90–93       | Excellent          |
| 87–89       | Very Good          |
| 80–86       | Meets Expectations |
| 70–79       | Needs Improvement  |
| 0–69        | Unsatisfactory     |

## Report Card Weight (10%)

Behavior contributes **10%** of the final report card grade.

```
Behavior Contribution = Behavior Score × 10%
```

### Example — Full report card

| Component   | Score | Weight | Contribution |
| ----------- | ----: | -----: | -----------: |
| Academic    |    87 |    80% |        69.60 |
| Attendance  |    95 |     5% |         4.75 |
| Homework*   |    90 |     5% |         4.50 |
| **Behavior**| **92**| **10%**| **9.20**     |

\* Assessment weights vary by grading scale configuration.

```
Final % = sum of all contributions
```

In this example, behavior adds **9.20 points** to the final grade (92 × 0.10).

## Business Rules

1. **One record per student per attendance date** — enforced by the attendance table unique constraint
2. **Teachers may edit behavior later** — saving attendance recalculates grades immediately
3. **Scores are never stored on the enrollment** — only weekly ratings on attendance records
4. **All calculations use `BehaviorCalculationService`** — same logic everywhere (profile, report card, transcript, dashboards, exports)

## For Teachers

### Recording behavior

1. Open attendance for your classroom and select the Sunday session
2. Mark each student's attendance (Present / Absent / Tardy)
3. Choose a behavior rating from the dropdown — each option shows its adjustment (e.g. `+2 Excellent`)
4. Save attendance

You do **not** enter a numeric score. The system calculates it from all ratings for the year.

### Editing behavior

Open the same session date, change the rating, and save again. The student's behavior score and report card update automatically.

## For Administrators

- Dashboard behavior averages use computed behavior percentages from final grades (default **85** when no ratings exist)
- Students with behavior below **75%** may appear as "at risk" on the school dashboard
- The migration to this system cleared all legacy behavior records and removed the old numeric scoring model

## Frequently Asked Questions

**Q: What if I forget to enter behavior for a week?**  
A: Nothing is recorded for that week. The student's score stays based on weeks you did record. With no records at all, the score remains **85 (Meets Expectations)**.

**Q: Can a student score above 100?**  
A: No. The final score is capped at 100.

**Q: Can behavior ever be zero for a new student?**  
A: No. With no ratings, the score is **85**, not zero.

**Q: Does absent attendance affect behavior score?**  
A: Behavior is recorded separately from attendance status. Only weeks where a rating is entered affect the score.

**Q: Where is the calculation implemented?**  
A: `src/lib/behavior/behavior-calculation-service.ts` — use `BehaviorCalculationService` for all behavior math.

**Q: How do I migrate existing data?**  
A: Run `npx dotenv -e .env.local -- tsx scripts/migrate-behavior-scoring.ts` or apply the Prisma migration `20250630000000_behavior_scoring`. Legacy behavior records are cleared as part of this breaking change.

## Technical Reference

```typescript
import { BehaviorCalculationService } from "@/lib/behavior";

const score = BehaviorCalculationService.calculateFromRaw([
  "EXCELLENT",
  "MEETS_EXPECTATIONS",
  "OUTSTANDING",
]);
// → 90

const level = BehaviorCalculationService.levelForScore(score);
// → "Excellent"

const contribution = BehaviorCalculationService.contributionToFinalGrade(score);
// → 9 (92 × 0.10 when score is 92)
```
