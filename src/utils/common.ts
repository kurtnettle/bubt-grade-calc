import { GRADE_POINTS, LOG_TAG } from "../consts";

export function cleanBracketText(text: string) {
  const pattern = /\(.*.\)/gi;
  return text.replace(pattern, "");
}

export function getSGPAValue(text: string) {
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

export function updateCellContent(
  cell: Element | null,
  condition: boolean,
  oldValue: string | number,
  newValue: string | number,
) {
  if (!cell) return;
  cell.textContent = condition ? newValue.toString() : oldValue.toString();
}

export function genGradeDropDown(
  credit: string,
  defaultGrade: string,
  onChange: () => void,
) {
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
    // updateGradeTexts();
    onChange();
  });

  return select;
}

export function addGradeDropdownToTable(
  table: Element,
  isAllPrevCourseTable: boolean,
  onChange: () => void,
) {
  if (!table) {
    console.info(`[${LOG_TAG}] : no table found.`);
    return;
  }

  let currSemesterNo = 0;
  const tableRows = table.querySelectorAll("tr");
  tableRows.forEach((row) => {
    const tds = row.querySelectorAll("td");

    if (isAllPrevCourseTable) {
      if (tds.length !== 5) {
        if (row.textContent?.includes("SEMESTER")) currSemesterNo++;
        return;
      }
    } else {
      if (tds.length < 3) {
        if (row.textContent?.includes("Semester")) currSemesterNo++;
        return;
      }
    }

    let creditCell;
    let gradeCell;

    if (isAllPrevCourseTable) {
      creditCell = tds[2];
      gradeCell = tds[4];
    } else {
      creditCell = tds[2];
      gradeCell = row.querySelector("th");
    }

    if (!creditCell || !gradeCell) return;

    const courseCode = tds[0];
    courseCode?.setAttribute("data-semester-number", currSemesterNo.toString());

    const grade = gradeCell?.textContent?.trim() || "";
    const credit = creditCell?.textContent?.trim() || "0";

    const gradeDropdown = genGradeDropDown(credit, grade, onChange);

    gradeCell.innerHTML = "";
    gradeCell.appendChild(gradeDropdown);
  });
}

export function addTotalTextRowToTable(
  table: Element,
  rowIndex: number,
  totalCredit: number,
  totalPoints: number,
  semesterNo: number,
  isAllPrevCourseTable: boolean,
) {
  const newRow = table.insertRow(rowIndex);
  newRow.align = "center";
  if (!isAllPrevCourseTable) newRow.style.backgroundColor = "#F0F0F0";
  newRow.setAttribute("data-semester-number", semesterNo);

  if (isAllPrevCourseTable) {
    // dummy cells :/
    let dummy = document.createElement("th");
    newRow.appendChild(dummy);
  }

  const totalTextCell = newRow.insertCell();
  totalTextCell.colSpan = 2;
  totalTextCell.style.textAlign = "right";
  totalTextCell.style.fontWeight = "bold";
  totalTextCell.textContent = "Total";

  const totalCreditCell = newRow.insertCell();
  totalCreditCell.textContent = totalCredit;

  if (isAllPrevCourseTable) {
    // dummy cells :/
    let dummy = document.createElement("td");
    newRow.appendChild(dummy);
  }

  const totalPointsCell = newRow.insertCell();
  totalPointsCell.textContent = totalPoints;
}
