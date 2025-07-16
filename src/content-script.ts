import {
  checkIfUserOnAllPrevPage,
  setupAllPrevGradeTable,
} from "./utils/all-prev-page";
import {
  checkIfUserOnSemesterWisePage,
  setupSemesterWiseGradeTable,
} from "./utils/sem-wise-page";

if (document.readyState === "complete") {
  main();
} else {
  document.addEventListener("DOMContentLoaded", main);
  window.addEventListener("load", main);
}

function main() {
  if (checkIfUserOnAllPrevPage()) setupAllPrevGradeTable();
  else if (checkIfUserOnSemesterWisePage()) setupSemesterWiseGradeTable();
}
