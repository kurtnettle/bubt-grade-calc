import {
  LOG_TAG,
  ALL_PREV_TABLE_SELECTOR,
  ALL_PREV_PAGE_HEADER_SELECTOR,
} from "../consts";
import {
  addGradeDropdownToTable,
  addTotalTextRowToTable,
  cleanBracketText,
  getSGPAValue,
  updateCellContent,
} from "./common";

function getGradeTable() {
  return document.querySelector(ALL_PREV_TABLE_SELECTOR);
}

function addTableTotalRows(table: Element) {
  if (!table) return;

  const semesterHeaders = table.querySelectorAll("tr > td[colspan='7']");
  if (semesterHeaders.length === 0) return;

  let semesterCount = 1;
  const rows = table.rows;

  semesterHeaders.forEach((header) => {
    const rowIndex = header.closest("tr")?.rowIndex;
    const rowText = rows[rowIndex]?.textContent?.trim();

    if (!rowIndex || rowIndex < 2 || !rowText.includes("SGPA")) return;
    addTotalTextRowToTable(table, rowIndex, 0, 0, semesterCount, true);
    semesterCount++;
  });
}

export function getImprovedGrade(table: Element, courseCode: string) {
  const xpath = `.//td[normalize-space(text())='${courseCode}']/parent::tr`;
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

  // annex may do some bs, we never know
  let iterations = 0;
  const MAX_ITERATIONS = 30;
  let currElemText = currElem?.textContent?.trim();

  while (
    currElem &&
    currElemText !== "" &&
    !currElemText?.includes("Total") &&
    iterations < MAX_ITERATIONS
  ) {
    const courseCodeCell = currElem.querySelector("td:nth-child(2)");
    const courseCode = courseCodeCell?.textContent?.trim() || "";
    const semesterNo = parseInt(
      courseCodeCell?.getAttribute("data-semester-number") || "0",
    );

    if (courseCode === "") {
      console.warn(
        `[${LOG_TAG}] - page semester-wise: empty course code found from row <${currElemText}>`,
      );
      currElem = currElem.nextElementSibling;
      iterations++;
      continue;
    }

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
      currElemText = currElem.textContent?.trim();
    }

    iterations++;
  }

  let totalCells = currElem?.querySelectorAll("td");

  if (totalCells?.length === 4) {
    updateCellContent(
      totalCells[1],
      nonSemesterCredit !== 0,
      semesterCredit,
      `${semesterCredit} (${nonSemesterCredit})`,
    );

    updateCellContent(
      totalCells[3],
      nonSemesterPoints !== 0,
      semesterPoints,
      `${semesterPoints} (${nonSemesterPoints})`,
    );
  }

  return {
    currElem,
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

  const semesters = table.querySelectorAll("tr > td[colspan='7']");
  semesters.forEach((row) => {
    const gradeCell = row.querySelector("strong");
    const currentText = gradeCell?.textContent?.trim().split("and") || "";
    if (currentText.length !== 2) return;

    const [SGPAText, CGPAText] = currentText;

    const oldCgpaCleanedText = cleanBracketText(CGPAText);
    const oldCGPA = oldCgpaCleanedText.split(":")[1]?.trim();

    const oldPointText = `${SGPAText} and ${oldCgpaCleanedText}`;

    try {
      const sgpa = getSGPAValue(SGPAText || "");
      if (!sgpa) return;

      totalPoints += sgpa;
      const newCGPA = (totalPoints / currSemesterNo).toFixed(2);

      updateCellContent(
        gradeCell,
        oldCGPA !== newCGPA,
        oldPointText,
        `${SGPAText} and ${oldCgpaCleanedText} (${newCGPA})`,
      );
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

function updateSGPAText(tableStart: Element, newSGPA: string) {
  const sGPACell = tableStart?.nextElementSibling?.querySelector("strong");
  if (!sGPACell || sGPACell?.textContent?.includes("SEMESTER")) return;

  const currentText = sGPACell.textContent?.trim().split("and") || "";
  const currentCleanedText = cleanBracketText(currentText[0]);

  const oldSGPA = currentCleanedText.split(":")[1]?.trim() || "";

  const oldText = `${currentCleanedText} and ${currentText[1]}`;
  const newText = `${currentCleanedText} (${newSGPA}) and ${currentText[1]}`;

  updateCellContent(sGPACell, newSGPA !== oldSGPA, oldText, newText);
}

function calcSgpa() {
  const table = getGradeTable();
  if (!table) return;

  const semesters = table.querySelectorAll("tr > td[colspan='7']");
  semesters.forEach((row) => {
    const x = updateSemesterTotalCreditAndGradePoints(table, row);
    const sgpa = x.semesterPoints / x.semesterCredit || 0;
    updateSGPAText(x.currElem, sgpa.toFixed(2));
  });
}

function updateGradeTexts() {
  calcSgpa();
  updateCgpaText();
}

export function checkIfUserOnAllPrevPage(): boolean {
  const isHeaderPresent = document
    .querySelector(ALL_PREV_PAGE_HEADER_SELECTOR)
    ?.textContent?.includes("previous");
  const isUrlMatch = document.URL.includes("38c366c15da2633c430828f8de90df5a");
  const isOnAllPrevPage = isHeaderPresent || isUrlMatch;
  console.info(
    `[${LOG_TAG}] - User ${isOnAllPrevPage ? "is" : "is not"} on all-prev page`,
  );

  return isOnAllPrevPage;
}

export function setupAllPrevGradeTable() {
  console.info(`[${LOG_TAG}] - page all-prev: starting initial processing`);

  const table = getGradeTable();
  if (!table) {
    console.info(`[${LOG_TAG}] - page all-prev: no table found.`);
    return;
  }
  addGradeDropdownToTable(table, true, updateGradeTexts);

  addTableTotalRows(table);
  updateGradeTexts();

  console.info(`[${LOG_TAG}] - page all-prev: finished initial processing.`);
}
