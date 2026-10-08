const multer = require("multer");

// Keep uploads in memory — files are immediately parsed (Excel/CSV) or
// forwarded to Pinata (PDF); nothing needs to persist on local disk beyond
// PDFKit's own generated output, which we write explicitly where needed.
const storage = multer.memoryStorage();

function fileFilter(allowedMimes) {
  return (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  };
}

const uploadSpreadsheet = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter([
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel",
    "text/csv",
    "application/csv",
  ]),
});

const uploadPDF = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: fileFilter(["application/pdf"]),
});

const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: fileFilter(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
});

// Used for registering an existing/legacy certificate, where the file could
// be a scanned photo or a PDF export of the original document.
const uploadCertificateFile = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: fileFilter([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
  ]),
});

module.exports = { uploadSpreadsheet, uploadPDF, uploadImage, uploadCertificateFile };
