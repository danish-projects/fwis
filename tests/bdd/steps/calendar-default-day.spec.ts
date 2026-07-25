import { describe, it, expect } from "vitest";
import { localWeekSundayKey } from "@/lib/calendar/calendar-date";
import { selectDefaultCalendarDayId } from "@/lib/calendar/select-default-day";

function day(id: string, iso: string) {
  return { id, date: new Date(`${iso}T00:00:00.000Z`) };
}

/** 2026-2027 sample Sundays from seed calendar (first few + last). */
const YEAR_DAYS = [
  day("first", "2026-08-02"),
  day("w2", "2026-08-09"),
  day("w3", "2026-08-16"),
  day("holiday", "2026-08-23"),
  day("w4", "2026-08-30"),
  day("quiz1", "2026-09-06"),
  day("last", "2027-05-09"),
];

describe("selectDefaultCalendarDayId", () => {
  it("selects first calendar date when today is before the year", () => {
    expect(
      selectDefaultCalendarDayId(YEAR_DAYS, new Date(2026, 6, 24)) // Jul 24
    ).toBe("first");
  });

  it("selects last calendar date when today is after the year", () => {
    expect(
      selectDefaultCalendarDayId(YEAR_DAYS, new Date(2027, 5, 1)) // Jun 1
    ).toBe("last");
  });

  it("selects this week's Sunday on Sunday", () => {
    expect(
      selectDefaultCalendarDayId(YEAR_DAYS, new Date(2026, 7, 30)) // Sun Aug 30
    ).toBe("w4");
  });

  it("selects previous Sunday mid-week", () => {
    expect(
      selectDefaultCalendarDayId(YEAR_DAYS, new Date(2026, 8, 2)) // Wed Sep 2 → Sun Aug 30
    ).toBe("w4");
  });

  it("falls back to previous calendar Sunday when week Sunday is missing", () => {
    // Week of Sep 13 has no calendar entry in YEAR_DAYS; previous is quiz1 Sep 6
    expect(
      selectDefaultCalendarDayId(YEAR_DAYS, new Date(2026, 8, 16)) // Wed Sep 16 → Sun Sep 13 missing
    ).toBe("quiz1");
  });
});

describe("localWeekSundayKey", () => {
  it("returns today on Sunday and previous Sunday otherwise", () => {
    expect(localWeekSundayKey(new Date(2026, 7, 30))).toBe("2026-08-30"); // Sun
    expect(localWeekSundayKey(new Date(2026, 7, 31))).toBe("2026-08-30"); // Mon
    expect(localWeekSundayKey(new Date(2026, 8, 5))).toBe("2026-08-30"); // Sat
  });
});
