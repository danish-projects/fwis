# FWIS School Data Import Guide

Migrate historical data from any Faizan Weekend Islamic School into Supabase using a free **Google Sheet** workflow. Microsoft Office is not required.

**One workbook = one school + one academic year.**

---

## Overview

| Step | Who | Action |
|------|-----|--------|
| 1 | FWIS admin | Generate the Excel template |
| 2 | FWIS admin | Upload to Google Drive and share |
| 3 | School admin | Make a copy and fill in data |
| 4 | School or admin | Download as `.xlsx` |
| 5 | FWIS admin | Validate with `--dry-run` |
| 6 | FWIS admin | Run import |
| 7 | Anyone | Update the sheet and re-import if needed |

**Prerequisite:** The school must already exist in FWIS with matching **city** and **state** (e.g. Houston, TX).

---

## Step 1 — Generate the template (FWIS admin)

On a machine with the FWIS project and Node.js installed:

```bash
npm run import:template
```

This creates:

`templates/fwis-school-data-import-template.xlsx`

The file contains seven tabs:

| Tab | Purpose |
|-----|---------|
| **Instructions** | Quick rules (not imported) |
| **School_Setup** | One row: school name, city, state, academic year, dates |
| **Teachers** | One row per teacher (one grade/section each) |
| **Students** | One row per enrolled student |
| **Attendance** | One row per student per Sunday |
| **Assessments** | Quiz and exam scores per student |
| **Calendar_Optional** | Custom Sunday types (leave empty to auto-generate) |

---

## Step 2 — Upload to Google Drive and share (FWIS admin)

1. Go to [Google Drive](https://drive.google.com)
2. **New → File upload** → select `fwis-school-data-import-template.xlsx`
3. Double-click the file → **Open with Google Sheets**

### Sharing permissions

| Who | Role | Why |
|-----|------|-----|
| **Master template** (blank, shared with all schools) | **Viewer** | Schools open it and **Make a copy** — they cannot break the master |
| **School’s own copy** (one school, one year) | **Editor** (school admin only) | They need to enter data |
| **Person running import** | No Google access needed | Only needs the downloaded `.xlsx` file |

**Recommended workflow**

1. Share the master template as **Viewer** (“Anyone with the link” → Viewer is fine)
2. Tell each school: **File → Make a copy**
3. School renames their copy, e.g. `FWIS Import — Houston 2024-2025`
4. School fills their copy (they are automatic **Editor** on their own copy)

**Avoid**

| Permission | Risk |
|------------|------|
| **Editor** on the master template for everyone | Tabs or column headers can be deleted or renamed |
| **Anyone with the link → Editor** | Public edit access |
| **Commenter** for data entry | Cannot edit cells |
| One **Editor** sheet shared by multiple schools | Data gets mixed up |

---

## Step 3 — Fill in the Google Sheet (school admin)

Work through the tabs **in this order**:

1. **School_Setup** — exactly **one row** (defines school + academic year for the whole file)
2. **Teachers** — one row per teacher
3. **Students** — one row per student
4. **Attendance** — one row per student per Sunday
5. **Assessments** — one row per student (scores)
6. **Calendar_Optional** — only if you need custom session types per date

Delete all **example rows** before entering real data.

### Copy school and year values everywhere

From **School_Setup**, copy these into **every row** on the other tabs:

| School_Setup column | Use on other sheets as | Example |
|---------------------|------------------------|---------|
| `city` | `school_city` | `Houston` |
| `state` | `school_state` | `TX` |
| `academic_year` | `academic_year` | `2024-2025` |

Teachers only need `school_city` and `school_state` (no `academic_year` column).

### Fill order checklist

- [ ] **School_Setup**: `school_name`, `city`, `state`, `academic_year`, `year_start_date`, `year_end_date`
- [ ] **Teachers**: all teachers for this school; each assigned to one `grade` + `section`
- [ ] **Students**: every enrolled student; assign `student_id` (e.g. `HOU-B1`) then copy to Attendance/Assessments
- [ ] **Attendance**: every Sunday record; `student_id` must match the Students sheet
- [ ] **Assessments**: scores per student; same `student_id` as Students

### Do's and Don'ts

**Do**

| Do | Details |
|----|---------|
| Use one Google Sheet per school per academic year | e.g. Houston 2024-2025 only |
| Keep tab names exactly as provided | `School_Setup`, `Teachers`, `Students`, `Attendance`, `Assessments`, `Calendar_Optional` |
| Keep row 1 as column headers | Do not delete or rename header cells |
| Use grade `1`–`6` (or `Grade 1`–`Grade 6`) | On Teachers and Students |
| Use section `Boys` or `Girls` | `MALE` students → Boys; `FEMALE` students → Girls |
| Use dates as `YYYY-MM-DD` | e.g. `2024-09-08` (must be a **Sunday** for attendance) |
| Match `teacher_email` on Students to `email` on Teachers | Exact same address |
| Copy `school_city`, `school_state`, `academic_year` on every row | Must match School_Setup |
| Use `student_id` on Students, Attendance, and Assessments | Format `HOU-B1` (city code + B/G + number); copy from Students to other tabs |
| Leave `student_id` blank on Students to auto-assign on import | Then use legacy name columns on Attendance/Assessments, or pre-fill IDs on Students first |

**Don't**

| Don't | Why |
|-------|-----|
| Rename sheet tabs | Import will fail |
| Change column header names in row 1 | Import will fail |
| Download as **CSV** | Loses multiple sheets; import breaks |
| Mix multiple schools in one file | Import is scoped to one city + state |
| Use grade `7`, `K`, or `Pre-K` | Only grades 1–6 are supported |
| Put attendance on a non-Sunday date | Calendar lookup will fail |
| Use different `student_id` for the same student across tabs | Attendance and assessments won't link |
| Use different grade/section for the same student across tabs | Legacy name matching won't link |

### Quick value reference

**Grade** (Teachers, Students, Attendance, Assessments): `1`–`6` or `Grade 1`–`Grade 6`

**Section:** `Boys` or `Girls`

**Gender** (Students): `MALE` or `FEMALE`

**Attendance status:** `Present`, `Absent`, or `Tardy`

**Assessment scores:** numbers `0`–`100`, or leave blank if not taken

**Student ID** (Students, Attendance, Assessments): `HOU-B1`, `HOU-G2`, etc. — 3-letter city code, `B` (boys) or `G` (girls), sequence number. Assign on the **Students** sheet first, then copy the same value to Attendance and Assessments.

**Student matching** — Attendance and Assessments link to Students by `student_id`:

```
school_city + school_state + academic_year + student_id
```

Example: Students has `student_id=HOU-B1` for Ahmed → every Attendance/Assessments row for Ahmed uses `student_id=HOU-B1`.

Older workbooks without `student_id` still work using `student_first_name`, `student_last_name`, `grade`, and `section` on Attendance/Assessments.

---

## Step 4 — Download as Excel (school or admin)

The import script reads **`.xlsx` files only** — not a live Google Sheets link.

1. Open the completed Google Sheet
2. **File → Download → Microsoft Excel (.xlsx)**
3. Save e.g. `houston-2024-2025.xlsx`
4. Send the file to the FWIS admin (or keep it if you run the import yourself)

**Do not** use **File → Download → Comma Separated Values (.csv)**.

---

## Step 5 — Validate before import (FWIS admin)

```bash
npm run import:school -- --file path/to/houston-2024-2025.xlsx --dry-run
```

Dry run will:

- Validate sheet names and column headers
- Check that `school_city`, `school_state`, and `academic_year` match across tabs
- Validate `student_id` on Students, Attendance, and Assessments (format, duplicates, and cross-sheet references)
- Validate calendar days: no attendance on holidays/non-instructional days; quiz and final exam days require matching assessment scores
- Print row counts from the file
- Show **existing database records** for that school + year (if any)
- Make **no changes** to the database

Fix any errors in the Google Sheet, download a fresh `.xlsx`, and dry-run again.

---

## Step 6 — Import into Supabase (FWIS admin)

```bash
npm run import:school -- --file path/to/houston-2024-2025.xlsx
```

The script will:

1. Find the school by **city + state**
2. If data already exists for that school + year → **prompt to delete** (see Step 7)
3. Create the academic year if missing
4. Generate calendar Sundays (unless Calendar_Optional is filled)
5. Upsert teachers and assign each to one grade/section
6. Create students and enrollments
7. Import attendance and assessment scores
8. Compute final grades

Skip the delete prompt in automation:

```bash
npm run import:school -- --file path/to/houston-2024-2025.xlsx --yes
```

---

## Step 7 — Updating data and re-importing

Use this when you need to fix mistakes or add missing rows after an import.

### Update the Google Sheet

1. Open the school’s Google Sheet copy (or re-download is not enough — **edit the Sheet**)
2. Make your changes on the relevant tabs:
   - Wrong student grade → fix **Students**, **Attendance**, and **Assessments** for that child
   - Missing attendance → add rows on **Attendance**
   - Missing scores → update **Assessments**
   - New teacher → add row on **Teachers**, then update **Students** `teacher_email`
3. Keep `school_city`, `school_state`, and `academic_year` consistent on every row
4. **File → Download → Microsoft Excel (.xlsx)** again (new file overwrites old download)

### Re-run import

```bash
npm run import:school -- --file path/to/updated-houston-2024-2025.xlsx --dry-run
npm run import:school -- --file path/to/updated-houston-2024-2025.xlsx
```

If **city**, **state**, and **academic_year** already have data in the database, you will see:

```text
Existing import data found for "Faizan Weekend School Houston" (Houston, TX)
Academic year: 2024-2025

Records that will be DELETED (this school and year only):
  Enrollments:      ...
  Attendance:       ...
  ...

Other schools and other academic years will NOT be affected.

Type "yes" to delete the records above and continue import, or "no" to cancel:
```

| Your answer | Result |
|-------------|--------|
| `yes` | Deletes **only** that school’s data for that year, then imports the updated file |
| `no` | Cancels — nothing is deleted |

**What gets deleted (this school + year only):** enrollments, attendance, assessments, behavior history, final grades, calendar days, and orphan student records with no other enrollments.

**Never deleted:** other schools (Chicago, Dallas, etc.), other academic years, the school record, or the academic year record.

To replace data without typing `yes`:

```bash
npm run import:school -- --file path/to/updated-file.xlsx --yes
```

### Re-import workflow summary

```text
Edit Google Sheet → Download .xlsx → dry-run → import (confirm delete if prompted) → verify in FWIS app
```

---

## Appendix A — Column reference (all sheets)

### School_Setup (exactly 1 row)

| Column | Example | Required |
|--------|---------|----------|
| school_name | Faizan Weekend School Houston | Yes |
| city | Houston | Yes — must match `schools.city` in FWIS |
| state | TX | Yes — must match `schools.state` |
| academic_year | 2024-2025 | Yes |
| year_start_date | 2024-09-08 | Yes (`YYYY-MM-DD`) |
| year_end_date | 2025-05-25 | Yes (`YYYY-MM-DD`) |

### Teachers

| Column | Example | Required |
|--------|---------|----------|
| school_city | Houston | Yes — match School_Setup |
| school_state | TX | Yes |
| first_name | Muhammad | Yes |
| last_name | Usman Khan | Yes |
| email | grade1.boys.houston@fwis.org | Yes — referenced by Students |
| phone | 555-3001 | No |
| grade | 1 | Yes |
| section | Boys | Yes |

### Students

| Column | Example | Required |
|--------|---------|----------|
| school_city | Houston | Yes |
| school_state | TX | Yes |
| academic_year | 2024-2025 | Yes |
| student_id | HOU-B1 | No — auto-assigned if blank; required on Attendance/Assessments |
| first_name | Ahmed | Yes |
| last_name | Khan | Yes |
| gender | MALE | Yes |
| grade | 1 | Yes |
| section | Boys | Yes |
| teacher_email | grade1.boys.houston@fwis.org | Yes — match Teachers.email |
| parent_name | Khan Parent | No |
| parent_phone | 555-1001 | No |
| parent_email | parent@email.com | No |
| enrollment_date | 2024-09-08 | No |

### Attendance

| Column | Example | Required |
|--------|---------|----------|
| school_city | Houston | Yes |
| school_state | TX | Yes |
| academic_year | 2024-2025 | Yes |
| student_id | HOU-B1 | Yes — match Students |
| date | 2024-09-08 | Yes — Sunday, `YYYY-MM-DD` |
| status | Present | Yes |

### Assessments

| Column | Example | Required |
|--------|---------|----------|
| school_city | Houston | Yes |
| school_state | TX | Yes |
| academic_year | 2024-2025 | Yes |
| student_id | HOU-B1 | Yes — match Students |
| quiz_1 … quiz_5 | 92 | No (0–100) |
| midterm_project | 87 | No |
| final_exam | 93 | No |

### Calendar_Optional

Leave empty unless you need custom session types. Otherwise Sundays are auto-generated from `year_start_date` and `year_end_date` using the default quiz schedule (quiz every 8th Sunday).

| Column | Example | Required |
|--------|---------|----------|
| date | 2024-09-08 | Yes — must be a Sunday in the academic year |
| session_type | HOLIDAY | Yes |
| sunday_number | 1 | No |

**Calendar validation (dry-run and import):**

| Rule | Details |
|------|---------|
| Holidays | Do not record attendance on `HOLIDAY`, `PARENT_MEETING`, or `GRADUATION` days |
| Quiz days | If the calendar includes `QUIZ_1` … `QUIZ_5`, every student must have the matching `quiz_1` … `quiz_5` score on Assessments |
| Final exam | If the calendar includes `FINAL_EXAM`, every student must have a `final_exam` score |
| Midterm | If the calendar includes `MIDTERM_PROJECT`, every student must have a `midterm_project` score |

---

## Appendix B — How data links in the database

```
School_Setup (city, state, academic_year)
        │
        ├──► schools                         ← matched by city + state
        │         │
        │         ├──► academic_years        ← matched by academic_year name
        │         │         ├──► academic_calendar_days
        │         │         └──► student_enrollments.academic_year_id
        │         │
        │         ├──► classrooms            ← Grade 1 Boys, Grade 1 Girls, …
        │         ├──► teachers.school_id
        │         │         └──► teacher_classrooms → classroom
        │         └──► student_enrollments.school_id
        │                   ├──► attendance
        │                   └──► assessment_scores
        │
        └──► students (person) → linked via student_enrollments
```

### Foreign keys by sheet

| Sheet | Excel keys | Database FK |
|-------|------------|-------------|
| School_Setup | `city`, `state` | `schools` |
| School_Setup | `academic_year` | `academic_years` |
| Teachers | `school_city`, `school_state` | `teachers.school_id` |
| Teachers | `grade`, `section` | `teacher_classrooms` → `classrooms` |
| Students | `school_city`, `school_state`, `academic_year` | `student_enrollments` |
| Students | `teacher_email` | `student_enrollments.teacher_id` |
| Students | `grade`, `section` | `student_enrollments.classroom_id` |
| Attendance | student name + grade + section + year | `attendance.enrollment_id` |
| Attendance | `date` | `attendance.calendar_day_id` |
| Assessments | student name + grade + section + year | `assessment_scores.enrollment_id` |

### Valid values (setup tables)

Allowed values are stored in database **setup / lookup tables** (`session_types`, `grades`, `sections`, `genders`, `attendance_statuses`, `behavior_values`, `assessment_types`, `enrollment_statuses`). Invalid values are rejected by foreign-key constraints.

**Attendance status**

| Excel | Database |
|-------|----------|
| Present, PRESENT, P | PRESENT |
| Absent, ABSENT, A | ABSENT |
| Tardy, TARDY, T, Late | TARDY |

**Assessment columns → database type**

| Column | Type |
|--------|------|
| quiz_1 … quiz_5 | QUIZ_1 … QUIZ_5 |
| midterm_project | MIDTERM_PROJECT |
| final_exam | FINAL_EXAM |

**Calendar session_type**

`INSTRUCTIONAL`, `QUIZ_1`, `QUIZ_2`, `QUIZ_3`, `QUIZ_4`, `QUIZ_5`, `MIDTERM_PROJECT`, `FINAL_EXAM`, `PARENT_MEETING`, `HOLIDAY`, `GRADUATION`, `MAKEUP`

Legacy import value `QUIZ` is accepted and mapped to `QUIZ_1`.

### Classroom names from grade + section

| grade | section | Classroom in DB |
|-------|---------|-----------------|
| 1 | Boys | Grade 1 Boys |
| 1 | Girls | Grade 1 Girls |
| … | … | … |
| 6 | Girls | Grade 6 Girls |

---

## Appendix C — Houston walkthrough

1. `npm run import:template`
2. Upload template to Google Drive; share master as **Viewer**
3. School: **Make a copy** → `FWIS Import — Houston 2024-2025`
4. Fill tabs; use `city=Houston`, `state=TX`, `academic_year=2024-2025` everywhere
5. **Download → Microsoft Excel (.xlsx)**
6. `npm run import:school -- --file houston-2024-2025.xlsx --dry-run`
7. `npm run import:school -- --file houston-2024-2025.xlsx`
8. Log in to FWIS and verify enrollments, attendance, and assessments

---

## Command reference

| Command | Purpose |
|---------|---------|
| `npm run import:template` | Generate blank template |
| `npm run import:school -- --file <path> --dry-run` | Validate file; show existing DB data |
| `npm run import:school -- --file <path>` | Import (prompts if data exists) |
| `npm run import:school -- --file <path> --yes` | Import without delete prompt |
| `npm run db:purge -- --all [--yes]` | Delete all operational data; keep setup tables and app users |
| `npm run db:purge -- --city Houston --state TX [--yes]` | Delete one school's data (including the school record) |
