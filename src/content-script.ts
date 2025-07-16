import { LOG_TAG } from "./consts";
import {
  addTableTotalRows,
  genGradeDropDown,
  getGradeTable,
  updateGradeTexts,
} from "./utils";

if (document.readyState === "complete") {
  main();
} else {
  document.addEventListener("DOMContentLoaded", main);
  window.addEventListener("load", main);
}

function main() {
  console.info(`[${LOG_TAG}] starting to process`);

  const table = getGradeTable();
  if (!table) {
    console.info(`[${LOG_TAG}] no table found.`);
    return;
  }

  let currSemesterNo = 0;
  const tableRows = table.querySelectorAll("tr");
  tableRows.forEach((row) => {
    if (row.querySelectorAll("td").length < 3) {
      if (row.textContent?.includes("Semester")) currSemesterNo++;
      return;
    }

    const creditCell = row.querySelector("td:nth-child(3)");
    const gradeCell = row.querySelector("th");

    if (!creditCell || !gradeCell) return;

    const courseCode = row.querySelector("td:nth-child(1)");
    courseCode?.setAttribute("data-semester-number", currSemesterNo.toString());

    const grade = gradeCell?.textContent?.trim() || "";
    const credit = creditCell?.textContent?.trim() || "0";

    const gradeDropdown = genGradeDropDown(credit, grade);

    gradeCell.innerHTML = "";
    gradeCell.appendChild(gradeDropdown);
  });

  addTableTotalRows();
  updateGradeTexts();

  console.info("[bubt-grade-calc] finished initial processing.");
}
