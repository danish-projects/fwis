/**
 * Foundation seed data snapped from production (stable UUIDs).
 * Tables: schools, academic_years, academic_year_schools,
 * academic_year_holidays, academic_calendar_days (via template),
 * classroom_schools (Grade 1–6 Boys/Girls for every school).
 */
export type SeedSchool = {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  cityCode: string;
  /** Used for default login display names (e.g. Houston when city is Sugar Land). */
  loginCityLabel: string;
  state: string;
  zipCode: string;
  isActive: true;
};

export type SeedCalendarDay = {
  date: string;
  sessionType: string;
  lessonPlanNumber: number | null;
};

export const SEED_SCHOOLS: SeedSchool[] = [
  {
    id: "e5d4e17d-163e-4711-a8ab-5f77059a09c0",
    code: "FWIS-CHI",
    name: "Faizan Weekend Islamic School - Chicago",
    address: "6821 N Western Ave",
    city: "Chicago",
    cityCode: "CHI",
    loginCityLabel: "Chicago",
    state: "IL",
    zipCode: "60645",
    isActive: true,
  },
  {
    id: "9df0a68b-8f28-4491-bbc9-20f93b835360",
    code: "FWIS-DAL",
    name: "Faizan Weekend Islamic School - Dallas",
    address: "641 W Brown St",
    city: "Dallas",
    cityCode: "DAL",
    loginCityLabel: "Dallas",
    state: "TX",
    zipCode: "75098",
    isActive: true,
  },
  {
    id: "84d3689c-6062-403e-97c2-6e154981ebd9",
    code: "FWIS-ATL",
    name: "Faizan Weekend Islamic School - Atlanta",
    address: "4991 Burns Rd NW",
    city: "Lilburn",
    cityCode: "ATL",
    loginCityLabel: "Atlanta",
    state: "GA",
    zipCode: "30047",
    isActive: true,
  },
  {
    id: "db42eba3-a469-409a-a1c6-40a91f23eb7b",
    code: "FWIS-SAC",
    name: "Faizan Weekend Islamic School - Sacramento",
    address: "4110 North Freeway Blvd",
    city: "Sacramento",
    cityCode: "SAC",
    loginCityLabel: "Sacramento",
    state: "CA",
    zipCode: "95834",
    isActive: true,
  },
  {
    id: "8e7b5c8c-a70b-47ca-b857-10431dd4f102",
    code: "FWIS-HOU",
    name: "Faizan Weekend Islamic School - Houston",
    address: "13130 Alston Rd",
    city: "Sugar Land",
    cityCode: "HOU",
    loginCityLabel: "Houston",
    state: "Texas",
    zipCode: "77478",
    isActive: true,
  },
];

export const SEED_ACADEMIC_YEAR = {
  id: "531d563f-e1cf-48f8-a55d-fe33471a10d1",
  name: "2026-2027",
  startDate: "2026-08-02",
  endDate: "2027-05-09",
} as const;

/** academic_year_schools — one active link per school. */
export const SEED_ACADEMIC_YEAR_SCHOOLS = [
  {
    id: "d0c4e293-c504-4045-bbf7-a08310a39317",
    academicYearId: SEED_ACADEMIC_YEAR.id,
    schoolId: "84d3689c-6062-403e-97c2-6e154981ebd9", // ATL
    isActive: true,
  },
  {
    id: "541b9716-eb94-473a-8f94-ef826fdeaff4",
    academicYearId: SEED_ACADEMIC_YEAR.id,
    schoolId: "e5d4e17d-163e-4711-a8ab-5f77059a09c0", // CHI
    isActive: true,
  },
  {
    id: "3b03df9b-f3f7-4f50-95c4-62b43a346999",
    academicYearId: SEED_ACADEMIC_YEAR.id,
    schoolId: "9df0a68b-8f28-4491-bbc9-20f93b835360", // DAL
    isActive: true,
  },
  {
    id: "295c59ea-683c-4a10-afcd-d3dbd54e8672",
    academicYearId: SEED_ACADEMIC_YEAR.id,
    schoolId: "8e7b5c8c-a70b-47ca-b857-10431dd4f102", // HOU
    isActive: true,
  },
  {
    id: "8bb60c32-a2cd-49b8-b1b5-f608818fc1e4",
    academicYearId: SEED_ACADEMIC_YEAR.id,
    schoolId: "db42eba3-a469-409a-a1c6-40a91f23eb7b", // SAC
    isActive: true,
  },
] as const;

export const SEED_HOLIDAYS = [
  {
    id: "be5fd5cc-be0c-4671-ac50-7bf67122d69e",
    academicYearId: SEED_ACADEMIC_YEAR.id,
    date: "2026-08-23",
    name: "Eid Meelad un Nabi",
  },
  {
    id: "ce3b2ac5-ba64-4a7c-8c72-7b6a258f4660",
    academicYearId: SEED_ACADEMIC_YEAR.id,
    date: "2026-11-29",
    name: "Thanksgiving",
  },
  {
    id: "37841ce2-d09c-4a6e-9dd2-98be7301e682",
    academicYearId: SEED_ACADEMIC_YEAR.id,
    date: "2026-12-27",
    name: "Winter Break",
  },
  {
    id: "77462b3a-0aa8-47d2-8fc6-d705d050f100",
    academicYearId: SEED_ACADEMIC_YEAR.id,
    date: "2027-01-03",
    name: "Shab e Mairaj",
  },
  {
    id: "77572241-1d7e-4fcb-9e7c-4fcb0c1a12ef",
    academicYearId: SEED_ACADEMIC_YEAR.id,
    date: "2027-01-24",
    name: "Shab e Barat",
  },
  {
    id: "28f0971e-800f-4f3d-ae74-7cda319e6545",
    academicYearId: SEED_ACADEMIC_YEAR.id,
    date: "2027-02-28",
    name: "Shab e Qadr",
  },
  {
    id: "0661b660-8a77-4dfe-9ba9-166eeb7beda4",
    academicYearId: SEED_ACADEMIC_YEAR.id,
    date: "2027-03-07",
    name: "Eid ul Fitr",
  },
] as const;

/** Identical 41-day Sunday calendar applied to every school year link. */
export const SEED_CALENDAR_DAYS: SeedCalendarDay[] = [
  { date: "2026-08-02", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 1 },
  { date: "2026-08-09", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 2 },
  { date: "2026-08-16", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 3 },
  { date: "2026-08-23", sessionType: "HOLIDAY", lessonPlanNumber: null },
  { date: "2026-08-30", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 4 },
  { date: "2026-09-06", sessionType: "QUIZ_1", lessonPlanNumber: 5 },
  { date: "2026-09-13", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 6 },
  { date: "2026-09-20", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 7 },
  { date: "2026-09-27", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 8 },
  { date: "2026-10-04", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 9 },
  { date: "2026-10-11", sessionType: "QUIZ_2", lessonPlanNumber: 10 },
  { date: "2026-10-18", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 11 },
  { date: "2026-10-25", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 12 },
  { date: "2026-11-01", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 13 },
  { date: "2026-11-08", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 14 },
  { date: "2026-11-15", sessionType: "QUIZ_3", lessonPlanNumber: 15 },
  { date: "2026-11-22", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 16 },
  { date: "2026-11-29", sessionType: "HOLIDAY", lessonPlanNumber: null },
  { date: "2026-12-06", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 17 },
  { date: "2026-12-13", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 18 },
  { date: "2026-12-20", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 19 },
  { date: "2026-12-27", sessionType: "HOLIDAY", lessonPlanNumber: null },
  { date: "2027-01-03", sessionType: "HOLIDAY", lessonPlanNumber: null },
  { date: "2027-01-10", sessionType: "MIDTERM_PROJECT", lessonPlanNumber: 20 },
  { date: "2027-01-17", sessionType: "QUIZ_4", lessonPlanNumber: 21 },
  { date: "2027-01-24", sessionType: "HOLIDAY", lessonPlanNumber: null },
  { date: "2027-01-31", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 22 },
  { date: "2027-02-07", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 23 },
  { date: "2027-02-14", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 24 },
  { date: "2027-02-21", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 25 },
  { date: "2027-02-28", sessionType: "HOLIDAY", lessonPlanNumber: null },
  { date: "2027-03-07", sessionType: "HOLIDAY", lessonPlanNumber: null },
  { date: "2027-03-14", sessionType: "QUIZ_5", lessonPlanNumber: 26 },
  { date: "2027-03-21", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 27 },
  { date: "2027-03-28", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 28 },
  { date: "2027-04-04", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 29 },
  { date: "2027-04-11", sessionType: "INSTRUCTIONAL", lessonPlanNumber: 30 },
  { date: "2027-04-18", sessionType: "MAKEUP", lessonPlanNumber: null },
  { date: "2027-04-25", sessionType: "FINAL_EXAM", lessonPlanNumber: 32 },
  { date: "2027-05-02", sessionType: "PARENT_MEETING", lessonPlanNumber: null },
  { date: "2027-05-09", sessionType: "GRADUATION", lessonPlanNumber: null },
];
