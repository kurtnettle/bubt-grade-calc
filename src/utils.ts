import { GRADE_POINTS, GRADE_TABLE_SELECTOR, LOG_TAG } from "./consts";

function cleanBracketText(text: string) {
  const pattern = /\(.*.\)/gi;
  return text.replace(pattern, "");
}

function updateCellContent(
  cell: Element | null,
  condition: boolean,
  oldValue: string | number,
  newValue: string | number,
) {
  if (!cell) return;
  cell.textContent = condition ? newValue.toString() : oldValue.toString();
}

function getSGPAValue(text: string) {
  // SGPA: 3.00
  // SGPA: 3.00 (2.52)

  const parts = text.split(":");
  try {
    return parseFloat(parts[1].match(/\(([^)]+)\)/)?.[1] || parts[1]);
  } catch (error) {
    console.error(
      `[${LOG_TAG}] Failed to extract SGPA from '${text}':`,
      error.message,
    );
  }
}

export function getGradeTable() {
  return document.querySelector(GRADE_TABLE_SELECTOR);
}

export function genGradeDropDown(credit: string, defaultGrade: string) {
  const select = document.createElement("select");
  select.setAttribute("data-credit", credit);

  // empty selection for missing grade :/
  const option = document.createElement("option");
  option.value = "0.00";
  option.textContent = "-";
  option.selected = defaultGrade === "";
  select.appendChild(option);

  Object.keys(GRADE_POINTS).forEach((grade) => {
    const option = document.createElement("option");
    option.value = GRADE_POINTS[grade];
    option.textContent = grade;

    if (grade === defaultGrade) option.selected = true;

    select.appendChild(option);
  });

  select.addEventListener("change", (e) => {
    updateGradeTexts();
  });

  return select;
}

function addTableTotalRow(
  rowIndex: number,
  totalCredit: number,
  totalPoints: number,
  semesterNo: number,
) {
  const table = getGradeTable();
  if (!table) return;

  const newRow = table.insertRow(rowIndex);
  newRow.align = "center";
  newRow.style.backgroundColor = "#F0F0F0";
  newRow.setAttribute("data-semester-number", semesterNo);

  const totalTextCell = newRow.insertCell();
  totalTextCell.colSpan = 2;
  totalTextCell.align = "right";
  totalTextCell.style.fontWeight = "bold";
  totalTextCell.textContent = "Total";

  const totalCreditCell = newRow.insertCell();
  totalCreditCell.textContent = totalCredit;

  const totalPointsCell = newRow.insertCell();
  totalPointsCell.textContent = totalPoints;
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

export function addTableTotalRows() {
  const table = getGradeTable();
  if (!table) return;

  const semesterHeaders = table.querySelectorAll("tr > th[colspan='4']");
  if (semesterHeaders.length === 0) return;

  let semesterCount = 1;
  const rows = table.rows;

  semesterHeaders.forEach((header) => {
    const rowIndex = header.closest("tr")?.rowIndex;
    if (!rowIndex || rowIndex < 2) return;
    addTableTotalRow(rowIndex, 0, 0, semesterCount);
    semesterCount++;
  });

  // last semester
  const lastRowIndex = rows.length;
  addTableTotalRow(lastRowIndex, 0, 0, semesterCount);
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
          `[${LOG_TAG}] Invalid credit (${creditVal}) or grade value (${gradeVal}) found -_-`,
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

function updateSGPAText(tableStart: Element, newSemesterSGPA: string) {
  const sGPACell =
    tableStart?.parentElement?.nextElementSibling?.querySelector("th");
  if (!sGPACell) return;

  const currentText = sGPACell.textContent?.trim() || "";
  const currentCleanedText = cleanBracketText(currentText);

  const oldSGPA = currentCleanedText.split(":")[1]?.trim() || "";

  const sGPACellNewText = `${currentCleanedText} (${newSemesterSGPA})`;
  sGPACell.textContent = sGPACellNewText;

  updateCellContent(
    sGPACell,
    newSemesterSGPA !== oldSGPA,
    currentCleanedText,
    `${currentCleanedText} (${newSemesterSGPA})`,
  );
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
        `[${LOG_TAG}]`,
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
        `[${LOG_TAG}]`,
        `Failed to update CGPA of Semester ${currSemesterNo}:`,
        error,
      );
    } finally {
      currSemesterNo++;
    }
  });
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

export function updateGradeTexts() {
  calcSgpa();
  updateCgpaText();
}
