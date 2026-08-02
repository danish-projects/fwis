# FWIS School Data Import Guide

Import **Staff** and **Students** into FWIS PostgreSQL using a free **Google Sheet** workflow. Microsoft Office is not required.

**One workbook = one school + one academic year.**

**Prerequisites (must already exist in the database — import aborts if missing):**

| Resource | How matched | If missing |
|----------|-------------|------------|
| School | `school_city` + `school_state` | Import aborts |
| Academic year | `academic_year` name | Import aborts |
| Academic year ↔ school link | year linked to that school | Import aborts |
| App users | derived Staff logins (`{code}.b.g1`, `{code}.m.sub`, …) | Import aborts |
| Roles / grades / sections / genders | lookup tables | Import aborts (`npm run db:seed`) |

Import does **not** create schools, academic years, calendars, attendance, assessments, or app user logins.

**Template sheets only:** Instructions, **Staff**, **Students**.  
School_Setup, Teachers (legacy), Attendance, Assessments, and Calendar sheets are rejected.

---

## Overview

| Step | Who | Action |
|------|-----|--------|
| 1 | FWIS admin | Create school (**Create default app users**), academic year (linked to school) in the app |
| 2 | FWIS admin | Download template from **Backup → Import template** or `npm run import:template` |
| 3 | FWIS admin | Upload to Google Drive and share |
| 4 | School admin | Make a copy and fill Staff + Students |
| 5 | School or admin | Download as `.xlsx` |
| 6 | FWIS admin | Validate with `--dry-run` |
| 7 | FWIS admin | Run import |
| 8 | Anyone | Update the sheet and re-import if needed |

**Prerequisite:** Run `npm run db:seed` once for lookup tables and roles.

---

## Step 1 — Generate the template (FWIS admin)

```bash
npm run import:template
```

Creates: `templates/fwis-school-data-import-template.xlsx`

| Tab | Purpose |
|-----|---------|
| **Instructions** | Quick rules (not imported) |
| **Staff** | One row per principal/admin/teacher/substitute (login derived; no `user_id` column) |
| **Students** | One row per enrolled student |

Do **not** add School_Setup, Attendance, Assessments, Calendar, or a legacy Teachers sheet — the importer rejects them.

---

## Step 2 — Upload to Google Drive and share (FWIS admin)

1. Go to [Google Drive](https://drive.google.com)
2. **New → File upload** → select `fwis-school-data-import-template.xlsx`
3. Double-click → **Open with Google Sheets**
4. Share the master as **Viewer**; schools **File → Make a copy**

---

## Step 3 — Fill in the Google Sheet (school admin)

1. **Staff** — one row per teacher/substitute  
2. **Students** — one row per student  

Delete all **example rows** before entering real data.

Every row needs the same:

| Column | Example | Notes |
|--------|---------|-------|
| `school_city` | Houston | Must match an existing school |
| `school_state` | TX | |
| `academic_year` | 2024-2025 | Must match an existing year linked to that school |

### Staff sheet

| Column | Required | Notes |
|--------|----------|-------|
| `email` | No | Contact email only (not used for login). Blank is OK — staff is matched by derived `user_id` |
| `first_name`, `last_name` | Yes | |
| `staff_role` | No | `Principal`, `School Admin`, `Teacher` (default), or `Substitute` |
| `gender` | Principal / Admin / Substitute: Yes · Teacher: No | `MALE` / `FEMALE`. Teachers default from section |
| `grade`, `section` | Teacher: Yes · others: No | Classroom for Teacher only; leave blank for Principal / Admin / Substitute |
| `phone` | No | |

**Login `user_id` is not on the sheet.** Import derives it from the school’s 3-letter code:

| Role | Pattern | Example (HOU) |
|------|---------|---------------|
| Principal | `{code}.principal` | `hou.principal` |
| School Admin | `{code}.[m/f].admin` | `hou.m.admin`, `hou.f.admin` |
| Teacher | `{code}.[b/g].g{grade}` | `hou.b.g1`, `hou.g.g1` |
| Substitute | `{code}.[m/f].sub` | `hou.m.sub`, `hou.f.sub` |

Those logins must already exist (from **Create default app users**).

**Principal** = school-wide; no classroom; gender required for the staff record.  
**School Admin** = Boys/Girls scoped via `gender`; no classroom.  
**Teacher** = one classroom (grade + section).  
**Substitute** = section-scoped like admins (Boys or Girls via `gender`), **not** assigned to a classroom.

### Students sheet

| Column | Required | Notes |
|--------|----------|-------|
| `first_name`, `last_name`, `gender`, `grade`, `section` | Yes | Grade + section must match a Staff Teacher classroom |
| `student_id` | No | e.g. `HOU-B1`; blank = auto-assign |
| Address / guardian fields | No | |
| `enrollment_date` | No | Defaults to academic year start |

Enrollment staff is resolved from the Staff sheet Teacher with the same grade + section (no `teacher_user_id` column).

### Checklist

| Rule | Detail |
|------|--------|
| Keep tab names | `Staff`, `Students` |
| Same city/state/year on every row | Exact match |
| Staff logins exist first | Create school with default users; logins are derived on import |
| One teacher per classroom | Unique grade + section among Teachers only |
| Principal / Admin / Substitute | No grade/section; set gender |
| Student classroom covered | Every student grade + section has a Teacher on Staff |

---

## Step 4–5 — Download `.xlsx` and dry-run

```bash
npm run import:school -- --file path/to/school-year.xlsx --dry-run
```

Dry-run checks:

- Forbidden sheets are absent  
- School exists; academic year exists; year is linked to the school  
- Every derived Staff login exists in `app_users`, is active, belongs to the school (`user_schools`), and has matching Principal / School Admin / Teacher / Substitute role  
- No duplicate grade + section among Staff Teachers  
- Every student grade + section has a matching Staff Teacher  
- Student IDs are valid for the school city code  
- **All import FKs / lookups exist in DB:** `schools`, `academic_years`, `academic_year_schools`, `roles`, `genders`, `sections`, `grades`, `enrollment_statuses`  

No database writes on `--dry-run`.

---

## Step 6 — Import

```bash
npm run import:school -- --file path/to/school-year.xlsx
```

Use `--yes` to skip the purge confirmation when re-importing an existing school/year roster.

**What import does**

1. Resolves existing school + year link (fails if missing)  
2. Optionally purges existing **Staff + Students roster** for that school/year  
   (staff assignments, enrollments, and enrollment-linked attendance/scores).  
   Does **not** delete academic year, calendar, holidays, classrooms, or app users.  
3. Derives each Staff login from school code + grade/section (or gender); upserts staff + year assignment; **links** to existing `app_users` (never creates users). The same login may be linked to more than one staff record.  
4. Creates students + enrollments linked to the Teacher for that grade + section  

**What import does not do**

- Create school / academic year / calendar  
- Create app users or reset passwords  
- Import attendance, assessments, or holidays  
- Delete or recreate academic year / calendar when re-importing  

---

## Step 7 — Re-import

Re-importing the same school + year prompts to delete existing **Staff + Students roster** for that scope (staff assignments, students/enrollments, and related scores/attendance if present), then loads the workbook again. Academic year and calendar stay intact.

---

## Command reference

```bash
npm run import:template
npm run import:school -- --file templates/your-file.xlsx --dry-run
npm run import:school -- --file templates/your-file.xlsx
npm run import:school -- --file templates/your-file.xlsx --yes
```

---

## Appendix A — Column reference

### Staff

| Column | Example | Required |
|--------|---------|----------|
| school_city | Houston | Yes |
| school_state | TX | Yes |
| academic_year | 2024-2025 | Yes |
| first_name | Muhammad | Yes |
| last_name | Usman Khan | Yes |
| email | muhammad.usman@email.com | No — contact only; identity is derived login |
| phone | 555-3001 | No |
| staff_role | Teacher | No — Principal, School Admin, Teacher, or Substitute |
| gender | MALE | Yes for Principal / School Admin / Substitute; optional for Teacher |
| grade | 1 | Yes for Teacher; blank for Principal / Admin / Substitute |
| section | Boys | Yes for Teacher; blank for Principal / Admin / Substitute |

Login is derived (e.g. Principal at HOU → `hou.principal`; Teacher Grade 1 Boys → `hou.b.g1`).

### Students

| Column | Example | Required |
|--------|---------|----------|
| school_city | Houston | Yes |
| school_state | TX | Yes |
| academic_year | 2024-2025 | Yes |
| student_id | HOU-B1 | No |
| first_name | Ahmed | Yes |
| last_name | Khan | Yes |
| gender | MALE | Yes |
| email_address | parent@email.com | No |
| grade | 1 | Yes |
| section | Boys | Yes — with grade, must match a Staff Teacher |
| street_address … country | | No |
| father_/mother_* | | No |
| enrollment_date | 2024-09-08 | No |

---

## Appendix B — How rows link to the database

```
Staff grade+section (or gender) ──► derived login ──► app_users.user_id (must exist)
       │
       └──────────► staff + staff_assignments (for academic year)

Students.grade + section ──► Staff Teacher (same grade + section)
       │
       └──────────► student_enrollments.staff_id + classroom_id

school_city + school_state ► existing schools
academic_year ─────────────► existing academic_years + academic_year_schools
```

---

## Backup vs import

| Workbook | Sheets | Purpose |
|----------|--------|---------|
| **Import template** | Staff, Students | Roster load; school/year/users must exist |
| **School backup export** | School_Setup, Staff, Students, Attendance, Assessments, Calendar_Optional | Full year snapshot — **not** accepted by the roster importer |

For attendance and assessments after import, use the FWIS app (or re-enter via backup tooling separately).
