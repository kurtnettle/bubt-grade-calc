export const LOG_TAG = "bubt-grade-calc";

export const SEMESTER_WISE_PAGE_HEADER_SELECTOR = "div#message > div > h2";
export const SEMESTER_WISE_TABLE_SELECTOR = "input#tabseven + label + div.tab > table";

export const ALL_PREV_PAGE_HEADER_SELECTOR = "div#courseTbl > table#tableCrntAcdm";
export const ALL_PREV_TABLE_SELECTOR = "div#courseTbl > table#tableCrntAcdm";

export const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0,
  A: 3.75,
  "A-": 3.5,
  "B+": 3.25,
  B: 3.0,
  "B-": 2.75,
  "C+": 2.5,
  C: 2.25,
  D: 2.0,
  F: 0.0,
} as const;
