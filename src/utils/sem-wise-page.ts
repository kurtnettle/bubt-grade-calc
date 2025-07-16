import {
  LOG_TAG,
  SEMESTER_WISE_TABLE_SELECTOR,
  SEMESTER_WISE_PAGE_HEADER_SELECTOR,
} from "../consts";
import {
  addGradeDropdownToTable,
  addTotalTextRowToTable,
  cleanBracketText,
  getSGPAValue,
  updateCellContent,
} from "./common";

function getGradeTable() {
  return document.querySelector(SEMESTER_WISE_TABLE_SELECTOR);
}

function addTableTotalRows(table: Element) {
  if (!table) return;

  const semesterHeaders = table.querySelectorAll("tr > th[colspan='4']");
  if (semesterHeaders.length === 0) return;

  let semesterCount = 1;
  const rows = table.rows;

  semesterHeaders.forEach((header) => {
    const rowIndex = header.closest("tr")?.rowIndex;
    if (!rowIndex || rowIndex < 2) return;
    addTotalTextRowToTable(table, rowIndex, 0, 0, semesterCount, false);
    semesterCount++;
  });

  // last semester
  const lastRowIndex = rows.length;
  addTotalTextRowToTable(table, lastRowIndex, 0, 0, semesterCount, false);
}

export function getImprovedGrade(table: Element, courseCode: string) {
  const xpath = `.//td[text()='${courseCode}']/parent::tr`;
  const results = document.evaluate(
    xpath,
    table,
    null,
    XPathResult.ORDERED_NODE_ITERATOR_TYPE,
    null,
  );

  let courseSemester = 1000;
  let courseBestGrade = 0;

  let node = results.iterateNext();
  while (node) {
    let courseCodeCell = node.querySelector("td");
    const semesterNo = parseInt(
      courseCodeCell.getAttribute("data-semester-number"),
    );

    let gradePoint = "0";
    let gradePointCell = node.querySelector("select");
    if (gradePointCell) {
      gradePoint = gradePointCell?.value || "0";
    } else {
      gradePointCell = node.querySelector("td");
      gradePoint = gradePointCell?.textContent;
    }

    if (semesterNo) {
      courseSemester = Math.min(courseSemester, semesterNo);
      courseBestGrade = Math.max(courseBestGrade, parseFloat(gradePoint));
    }

    node = results.iterateNext();
  }

  return { courseSemester, courseBestGrade };
}

function updateSemesterTotalCreditAndGradePoints(
  mainTable: Element,
  tableStart: Element,
) {
  let semesterPoints = 0;
  let semesterCredit = 0;
  let nonSemesterPoints = 0;
  let nonSemesterCredit = 0;
  let currElem = tableStart.parentElement?.nextElementSibling;

  let hasReachedTableEnd = false;

  // annex may do some bs, we never know
  let iterations = 0;
  const MAX_ITERATIONS = 30;

  while (
    currElem &&
    !currElem.textContent?.includes("Semester") &&
    iterations < MAX_ITERATIONS
  ) {
    const courseCodeCell = currElem.querySelector("td");
    const courseCode = courseCodeCell?.textContent?.trim() || "";
    const semesterNo = parseInt(
      courseCodeCell?.getAttribute("data-semester-number") || "0",
    );

    // retake / improvement course code will occur more than once
    const { courseSemester, courseBestGrade } = getImprovedGrade(
      mainTable,
      courseCode,
    );

    const select = currElem.querySelector("select");
    if (select) {
      const creditVal = parseFloat(select.getAttribute("data-credit") || "0");
      const gradeVal = parseFloat(select.value) || 0;

      if (isNaN(creditVal) || isNaN(gradeVal)) {
        console.info(
          `[${LOG_TAG}] - page semester-wise: Invalid credit (${creditVal}) or grade value (${gradeVal}) found -_-`,
        );
      } else if (select.options[select.selectedIndex].text !== "-") {
        const points = creditVal * courseBestGrade;
        if (courseSemester !== semesterNo) {
          nonSemesterPoints = points;
          nonSemesterCredit += creditVal;
        } else {
          semesterCredit += creditVal;
          semesterPoints += points;
        }
      }
    }

    if (currElem.nextElementSibling) {
      currElem = currElem.nextElementSibling;
    } else {
      hasReachedTableEnd = true;
    }
    iterations++;
  }

  let semesterLastCell = currElem?.previousElementSibling;
  let totalCells = semesterLastCell?.querySelectorAll("td");
  if (hasReachedTableEnd) totalCells = currElem?.querySelectorAll("td");

  if (totalCells?.length === 3) {
    updateCellContent(
      totalCells[1],
      nonSemesterCredit !== 0,
      semesterCredit,
      `${semesterCredit} (${nonSemesterCredit})`,
    );

    updateCellContent(
      totalCells[2],
      nonSemesterPoints !== 0,
      semesterPoints,
      `${semesterPoints} (${nonSemesterPoints})`,
    );
  }

  return {
    semesterCredit,
    nonSemesterCredit,
    semesterPoints,
    nonSemesterPoints,
  };
}

function updateCgpaText() {
  const table = getGradeTable();
  if (!table) return;

  let currSemesterNo = 1;
  let totalPoints = 0;

  const semesters = table.querySelectorAll("tr > th[colspan='4']");
  semesters.forEach((row) => {
    const gradePointCells =
      row.parentElement?.nextElementSibling?.querySelectorAll("th");

    if (!gradePointCells || gradePointCells.length !== 2) {
      console.warn(
        `[${LOG_TAG}] - page semester-wise:`,
        `Skipping semester ${currSemesterNo} (invalid structure):`,
        "gradePointCells: ",
        gradePointCells,
      );
      currSemesterNo++;
      return;
    }

    const [sgpaCell, cgpaCell] = gradePointCells;
    const oldCgpaText = cgpaCell.textContent || "";
    const oldCgpaCleanedText = cleanBracketText(oldCgpaText);
    const oldCGPA = oldCgpaCleanedText.split(":")[1]?.trim();

    try {
      const sgpa = getSGPAValue(sgpaCell.textContent || "");
      if (sgpa) totalPoints += sgpa;

      if (oldCGPA) {
        const newCGPA = (totalPoints / currSemesterNo).toFixed(2);

        if (oldCGPA !== newCGPA) {
          cgpaCell.textContent = `${oldCgpaCleanedText} (${newCGPA})`;
        } else {
          cgpaCell.textContent = oldCgpaCleanedText;
        }
      }
    } catch (error) {
      console.error(
        `[${LOG_TAG}] - page semester-wise:`,
        `Failed to update CGPA of Semester ${currSemesterNo}:`,
        error,
      );
    } finally {
      currSemesterNo++;
    }
  });
}

function updateSGPAText(tableStart: Element, newSemesterSGPA: string) {
  const sGPACell =
    tableStart?.parentElement?.nextElementSibling?.querySelector("th");
  if (!sGPACell) return;

  const oldText = sGPACell.textContent?.trim() || "";
  const oldCleanedText = cleanBracketText(oldText);

  const oldSGPA = oldCleanedText.split(":")[1]?.trim() || "";

  const newText = `${oldCleanedText} (${newSemesterSGPA})`;

  updateCellContent(
    sGPACell,
    newSemesterSGPA !== oldSGPA,
    oldCleanedText,
    newText,
  );
}

function calcSgpa() {
  const table = getGradeTable();
  if (!table) return;

  const semesters = table.querySelectorAll("tr > th[colspan='4']");
  semesters.forEach((row) => {
    const x = updateSemesterTotalCreditAndGradePoints(table, row);
    const sgpa = (x.semesterPoints / x.semesterCredit).toFixed(2);
    updateSGPAText(row, sgpa);
  });
}

function updateGradeTexts() {
  calcSgpa();
  updateCgpaText();
}

export function checkIfUserOnSemesterWisePage(): boolean {
  const isHeaderPresent = document
    .querySelector(SEMESTER_WISE_PAGE_HEADER_SELECTOR)
    ?.textContent?.includes("Info");
  const isUrlMatch = document.URL.includes("course_result_info");
  const isOnSemesterPage = isHeaderPresent || isUrlMatch;
  console.info(
    `[${LOG_TAG}] - User ${isOnSemesterPage ? "is" : "is not"} on semester-wise page`,
  );
  return isOnSemesterPage;
}

export function setupSemesterWiseGradeTable() {
  console.info(
    `[${LOG_TAG}] - page semester-wise: starting initial processing`,
  );

  const table = getGradeTable();
  if (!table) {
    console.info(`[${LOG_TAG}] - page all-prev: no table found.`);
    return;
  }
  addGradeDropdownToTable(table, false, updateGradeTexts);

  addTableTotalRows(table);
  updateGradeTexts();

  console.info(
    `[${LOG_TAG}] - page semester-wise: finished initial processing.`,
  );
}
