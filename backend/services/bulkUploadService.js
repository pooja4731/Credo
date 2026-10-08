const ExcelJS = require("exceljs");
const { parse } = require("csv-parse/sync");

const REQUIRED_COLUMNS = ["studentName", "rollNumber", "department", "degree"];

/**
 * Parses an uploaded Excel (.xlsx) buffer into an array of student records.
 * Expects a header row matching REQUIRED_COLUMNS (case-insensitive, order-independent).
 */
async function parseExcelBuffer(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Uploaded file has no worksheets");

  const headerRow = sheet.getRow(1).values.slice(1).map((h) => String(h).trim());
  const colIndex = mapColumns(headerRow);

  const records = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const values = row.values.slice(1);
    if (values.every((v) => v === null || v === undefined || v === "")) return; // skip blank rows

    records.push(buildRecord(values, colIndex, rowNumber));
  });

  return validateRecords(records);
}

/** Parses an uploaded CSV buffer into an array of student records. */
function parseCSVBuffer(buffer) {
  const rows = parse(buffer.toString("utf-8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const records = rows.map((row, i) => ({
    rowNumber: i + 2, // +1 for header, +1 for 1-indexing
    studentName: row.studentName || row.StudentName || row["Student Name"],
    rollNumber: row.rollNumber || row.RollNumber || row["Roll Number"],
    department: row.department || row.Department,
    degree: row.degree || row.Degree,
  }));

  return validateRecords(records);
}

function mapColumns(headerRow) {
  const normalized = headerRow.map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const colIndex = {};
  REQUIRED_COLUMNS.forEach((col) => {
    const target = col.toLowerCase();
    const idx = normalized.findIndex((h) => h === target || h.includes(target));
    if (idx !== -1) colIndex[col] = idx;
  });
  return colIndex;
}

function buildRecord(values, colIndex, rowNumber) {
  return {
    rowNumber,
    studentName: colIndex.studentName !== undefined ? values[colIndex.studentName] : undefined,
    rollNumber: colIndex.rollNumber !== undefined ? values[colIndex.rollNumber] : undefined,
    department: colIndex.department !== undefined ? values[colIndex.department] : undefined,
    degree: colIndex.degree !== undefined ? values[colIndex.degree] : undefined,
  };
}

/**
 * Validates parsed records, separating valid rows from row-level errors so
 * the frontend can show an "auto preview" with per-row issues before the
 * institution confirms bulk issuance.
 */
function validateRecords(records) {
  const valid = [];
  const invalid = [];
  const seenRollNumbers = new Set();

  records.forEach((r) => {
    const errors = [];
    REQUIRED_COLUMNS.forEach((col) => {
      if (!r[col] || String(r[col]).trim() === "") {
        errors.push(`Missing ${col}`);
      }
    });

    const rollNumber = r.rollNumber ? String(r.rollNumber).trim() : "";
    if (rollNumber && seenRollNumbers.has(rollNumber)) {
      errors.push("Duplicate roll number within this file");
    }
    if (rollNumber) seenRollNumbers.add(rollNumber);

    const cleanRecord = {
      rowNumber: r.rowNumber,
      studentName: r.studentName ? String(r.studentName).trim() : "",
      rollNumber,
      department: r.department ? String(r.department).trim() : "",
      degree: r.degree ? String(r.degree).trim() : "",
    };

    if (errors.length > 0) {
      invalid.push({ ...cleanRecord, errors });
    } else {
      valid.push(cleanRecord);
    }
  });

  return { valid, invalid, totalRows: records.length };
}

module.exports = { parseExcelBuffer, parseCSVBuffer, REQUIRED_COLUMNS };
