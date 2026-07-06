# FWIS Leadership Demo

> **Present mode:** Open [`LEADERSHIP_DEMO.html`](./LEADERSHIP_DEMO.html) in your browser. Slide 9 is a **demo coverage checklist** (checkboxes you can tick during prep). The deck uses Mermaid for diagrams (requires internet on first load).

This deck explains **what FWIS does** and **how school data is organized** — from campus setup through Sunday attendance, behavior, and assessments.

---

## Slide 1 — Title

**Faizan Weekend Islamic School Management System (FWIS)**

One platform for Sunday schools: setup a campus once per year, enroll students, then track attendance, behavior, and grades every Sunday.

---

## Slide 2 — Features

| Area | What FWIS does |
|---|---|
| **School setup** | Manage schools, academic years, Sunday calendar, grades (1–6 Boys/Girls), and teachers |
| **Students** | Global student records; one person, many enrollments across years |
| **Enrollments** | Link each student to a school, year, grade, and teacher |
| **Attendance** | Mark Present / Absent / Tardy per student per Sunday; consolidate matrix for admins |
| **Behavior** | Nine behavior levels adjust each student’s behavior score (starts at 100) |
| **Assessments** | Quiz 1–5, midterm project, final exam scores in a classroom grid |
| **Final grades** | Weighted formula: 10% attendance + 10% behavior + 25% quizzes + 55% exams → letter grade & rank |
| **Access control** | Super Admin, School Admin, Teacher — each role sees only what they need |
| **Security** | HTTPS, encrypted student data, login & roles, input checks |

---

## Slide 3 — School data hierarchy (overview)

Everything rolls up under a **School**. Each **Academic Year** defines one Sunday season. The **Calendar** lists every Sunday and its session type. **Students** enroll into a **Grade** for that year; teachers record **Attendance**, **Behavior**, and **Assessments** against that enrollment.

```mermaid
flowchart TB
  subgraph setup["1 · School setup (admin, once per year)"]
    School["School"]
    Year["Academic Year"]
    Calendar["Sunday Calendar"]
    Grade["Grade / Classroom"]
    Teacher["Teacher"]

    School --> Year
    Year --> Calendar
    School --> Grade
    School --> Teacher
    Teacher --> Grade
  end

  subgraph people["2 · Students (admin)"]
    Student["Student\n(global record)"]
    Enroll["Enrollment\n(year + grade + teacher)"]

    Student --> Enroll
    School --> Enroll
    Year --> Enroll
    Grade --> Enroll
    Teacher --> Enroll
  end

  subgraph sunday["3 · Sunday operations (teacher)"]
    Attend["Attendance\nP / A / T"]
    Behavior["Behavior\n9 levels → score"]
    Assess["Assessments\nQuizzes & exams"]
    Final["Final Grade\nweighted %"]

    Enroll --> Attend
    Enroll --> Behavior
    Enroll --> Assess
    Calendar --> Attend
    Attend --> Final
    Behavior --> Final
    Assess --> Final
  end
```

**Read top to bottom:** configure the school → enroll students → teachers work on Sundays.

---

## Slide 4 — Setup layer (School → Year → Calendar)

| Entity | Role | Example |
|---|---|---|
| **School** | Top-level campus | Houston, Chicago, Dallas |
| **Academic Year** | One Sunday season under a school | 2025–2026 |
| **Calendar** | Every Sunday in that year with a session type | Instructional, Quiz 1–5, Holiday, Final exam |
| **Grade / Classroom** | 12 per school (Grades 1–6 × Boys/Girls) | Grade 1 Boys |
| **Teacher** | Assigned to one grade per year | Teaches Grade 1 Boys |

Calendar days drive which Sundays count toward attendance % and which session type applies (quiz day, holiday, etc.).

---

## Slide 5 — Student & enrollment

| Entity | Role |
|---|---|
| **Student** | Permanent record — name, gender, parent contact. Never duplicated. |
| **Enrollment** | Joins **Student + School + Academic Year + Grade + Teacher** for one season |

One student can have many enrollments (new year, new school, promoted grade). All Sunday data hangs off the **enrollment**, not the student alone.

```mermaid
flowchart LR
  Student["Student"] --> Enroll["Enrollment"]
  School["School"] --> Enroll
  Year["Academic Year"] --> Enroll
  Grade["Grade"] --> Enroll
  Teacher["Teacher"] --> Enroll
```

---

## Slide 6 — Attendance, behavior & assessments

All three attach to the **same enrollment** for the selected academic year.

```mermaid
flowchart TB
  Enroll["Enrollment"]
  Cal["Calendar day\n(Sunday + session type)"]

  Enroll --> Attend["Attendance record"]
  Cal --> Attend
  Enroll --> Beh["Behavior entry\n→ behavior score"]
  Enroll --> Scores["Assessment scores"]

  Attend --> FG["Final grade"]
  Beh --> FG
  Scores --> FG
```

| Module | Captured | Feeds final grade? |
|---|---|---|
| **Attendance** | Present / Absent / Tardy per Sunday | Yes — 10% |
| **Behavior** | Outstanding through Misconduct | Yes — 10% (from enrollment behavior score) |
| **Assessments** | Quiz 1–5 (5% each), midterm (15%), final (40%) | Yes — 80% of academic weight |

**Consolidate Attendance** (admin): students × Sundays matrix across grades.

---

## Slide 7 — Roles (who uses what)

| Role | Setup | Students / Enroll | Sunday entry |
|---|---|---|---|
| **Super Admin** | All schools | All schools | Oversight |
| **School Admin** | Their school | Their school | Attendance matrix, all grades |
| **Teacher** | — | — | Their grade only: attendance, behavior, assessments |

---

## Slide 8 — Security (plain language)

**Think of student data like school records in a locked office.**

| Protection | Simple explanation | What FWIS does |
|---|---|---|
| **HTTPS** | A sealed envelope on the road — nobody can read what you send while it travels | The site uses HTTPS so login, grades, and attendance are protected in the browser |
| **Encryption in transit** | Data is scrambled while moving between your computer and our servers | All web traffic uses TLS (the lock icon in the browser) |
| **Encryption at rest** | Sensitive papers stay in a locked filing cabinet, not on an open desk | Student private details (date of birth, parent phone, address) are encrypted in the database |
| **App security** | Only staff with the right key can open the right room | Sign-in required; Super Admin / School Admin / Teacher each see only their scope; actions are logged |
| **Input checks** | We verify forms before filing — reject bad or suspicious entries | Server-side validation on every form; limits on login attempts to block guessing |

**One-line summary for leadership:** Data is protected **on the way** (HTTPS), **at rest** (encrypted student PII), and **inside the app** (roles, login, validation).

---

## Slide 9 — Demo coverage checklist

Use this during prep or the live walkthrough. Check items off in [`LEADERSHIP_DEMO.html`](./LEADERSHIP_DEMO.html) (slide 9). Switch **School** and **Academic Year** in the app sidebar before most list pages.

### Global · Dashboards

| ☐ | Area | Route | What to show |
|---|---|---|---|
| ☐ | School switcher | sidebar | Super Admin: Houston vs Chicago; teachers, grades, enrollments filter to selected school |
| ☐ | Academic year switcher | sidebar | Calendar, enrollments, rankings, lesson plans follow selected year |
| ☐ | Super Admin dashboard | `/dashboard/super-admin` | Nationwide stats, top schools, Sunday attendance widget |
| ☐ | School Admin dashboard | `/dashboard/school-admin` | Students by grade, behavior at-risk |
| ☐ | Teacher dashboard | `/dashboard/teacher` | My grade stats and highlights |

### Setup

| ☐ | Area | Route | What to show |
|---|---|---|---|
| ☐ | Schools | `/schools` | FWIS codes (FWIS-HOU); detail & edit |
| ☐ | Academic years | `/academic-years` | Global year; school checkboxes on edit; FWIS Docs Drive folder on year |
| ☐ | Calendar | `/calendar` | Sundays; session types; bulk generate |
| ☐ | Grades | `/grades` | Grade 1–6 Boys/Girls per selected school |
| ☐ | Teachers | `/teachers` | Per-school list; assign one grade per teacher |
| ☐ | Grading scale | `/grading-scale` | Letter-grade thresholds |
| ☐ | Data backup | `/backup` | Export school year workbook |

### Students

| ☐ | Area | Route | What to show |
|---|---|---|---|
| ☐ | Students | `/students` | Global records; search; export |
| ☐ | Student profile | `/students/[id]/profile` | Year-by-year history |
| ☐ | Enrollments | `/enrollments` | Link student + year + grade; grade & status filters |

### Classroom · Sunday operations

| ☐ | Area | Route | What to show |
|---|---|---|---|
| ☐ | Attendance | `/attendance` or `/teacher/attendance` | P / A / T + behavior per Sunday |
| ☐ | Consolidate attendance | `/attendance/consolidate` | Students × Sundays matrix |
| ☐ | Assessments | `/assessments` or `/teacher/assessments` | Quiz 1–5, midterm, final grid |
| ☐ | Lesson plans | `/lesson-plans` | Drive PDFs: FWIS Docs/{year}/Lesson Plans/{grade} |
| ☐ | Transcript | `/transcript` | Printable class transcript |
| ☐ | Rankings | `/rankings` | Class rank; Export Certificate |

### Admin · Security

| ☐ | Topic | What to mention |
|---|---|---|
| ☐ | Users | `/users` — roles and school assignment |
| ☐ | HTTPS | Lock icon; TLS in transit |
| ☐ | Encryption at rest | Student PII encrypted in database |
| ☐ | Role-based access | Teachers → their grade only |
| ☐ | Audit log | Recent activity on Super Admin dashboard |

**Suggested order:** Setup (year → calendar → grades → teachers) → People (student → enrollment) → Sunday (attendance → assessments → rankings/transcript).

---

## Slide 10 — Live demo

Run `npm run setup` once, then:

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@fwis.org` | `FwisAdmin786!` |
| School Admin | `admin.houston@fwis.org` | `FwisAdmin786!` |
| Teacher | `grade1.boys.houston@fwis.org` | `FwisTeacher786!` |

**Suggested 10-minute flow**

1. School Admin — academic year + calendar (setup hierarchy)
2. School Admin — add student → create enrollment (people hierarchy)
3. Teacher — mark attendance + behavior on a Sunday (operations)
4. Teacher — enter assessment scores → show final grade preview

---

## Related docs

| Document | Contents |
|---|---|
| [`ER_DIAGRAM.md`](./ER_DIAGRAM.md) | Full database entity relationships |
| [`DATA_IMPORT.md`](./DATA_IMPORT.md) | Legacy spreadsheet import |
| [`README.md`](../README.md) | Local setup |
