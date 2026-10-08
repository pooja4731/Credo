const Institution = require("../models/Institution");
const Certificate = require("../models/Certificate");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const { asyncHandler } = require("../middleware/errorHandler");
const {
  CERTIFICATE_TYPES,
  issueCertificate,
  registerExistingCertificate,
} = require("../services/certificateService");
const { parseExcelBuffer, parseCSVBuffer } = require("../services/bulkUploadService");

/** GET /api/institution/dashboard — summary cards */
const getDashboard = asyncHandler(async (req, res) => {
  const institutionId = req.user.institution._id;

  const [issued, students, downloadsAgg] = await Promise.all([
    Certificate.countDocuments({ institution: institutionId, status: "issued" }),
    User.countDocuments({ role: "student", "institution": institutionId }),
    Certificate.aggregate([
      { $match: { institution: institutionId } },
      { $group: { _id: null, total: { $sum: "$downloadCount" } } },
    ]),
  ]);

  res.json({
    success: true,
    dashboard: {
      certificatesIssued: issued,
      // "Pending" reflects bulk-upload rows awaiting confirmation, which is
      // tracked client-side before commit (on-chain issuance is atomic per
      // record, so there is no server-side "pending certificate" state).
      pending: 0,
      students,
      downloads: downloadsAgg[0]?.total || 0,
    },
  });
});

/** GET /api/institution/profile */
const getProfile = asyncHandler(async (req, res) => {
  const institution = await Institution.findById(req.user.institution._id);
  res.json({ success: true, institution });
});

const HEX = /^#[0-9a-fA-F]{6}$/;
const BRANDING_KEYS = ["headerName", "tagline", "template", "fontFamily", "primaryColor", "accentColor", "footerText", "signatoryName", "signatoryTitle", "logoDataUrl", "certificateTitle", "headerCase", "headerSize", "bgColor"];
function cleanBranding(input) {
  const out = {};
  BRANDING_KEYS.forEach((k) => { if (typeof input[k] === "string") out[k] = input[k].trim(); });
  if (out.primaryColor && !HEX.test(out.primaryColor)) delete out.primaryColor;
  if (out.accentColor && !HEX.test(out.accentColor)) delete out.accentColor;
  if (out.bgColor && !HEX.test(out.bgColor)) delete out.bgColor;
  ["template", "fontFamily", "headerCase", "headerSize"].forEach((k) => { if (!out[k]) delete out[k]; });
  if (out.logoDataUrl && !/^data:image\/(png|jpe?g);base64,/.test(out.logoDataUrl)) delete out.logoDataUrl;
  return out;
}

/** POST /api/institution/branding/preview — renders a sample certificate with unsaved branding */
const previewBranding = asyncHandler(async (req, res) => {
  const { generateCertificatePDF } = require("../services/pdfService");
  const { generateQRBuffer } = require("../services/qrService");
  const inst = await Institution.findById(req.user.institution._id);
  const pdf = await generateCertificatePDF({
    studentName: "Sample Student", rollNumber: "ROLL-001", department: "Computer Science", degree: "Full Stack Development",
    certificateType: "course", typeDetails: { courseName: "Full Stack Development" },
    institutionName: inst.name, branding: cleanBranding(req.body.branding || {}),
    issueDate: new Date(), certificateId: "PREVIEW-0000", certificateHash: "a".repeat(64),
    qrCodeBuffer: await generateQRBuffer("PREVIEW-0000"),
  });
  res.set("Content-Type", "application/pdf").send(pdf);
});

/** PATCH /api/institution/profile */
const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = ["phone", "address", "website", "walletAddress"];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  if (req.body.branding) updates.branding = cleanBranding(req.body.branding);

  const institution = await Institution.findByIdAndUpdate(req.user.institution._id, updates, {
    new: true,
    runValidators: true,
  });
  res.json({ success: true, institution });
});

/** GET /api/institution/certificates/types — certificate types + their extra fields, for building the issue form */
const getCertificateTypes = asyncHandler(async (req, res) => {
  res.json({ success: true, types: CERTIFICATE_TYPES });
});

/**
 * POST /api/institution/certificates/issue
 * Single certificate issuance. Runs the full pipeline (hash → PDF → IPFS →
 * blockchain → MongoDB) and streams the resulting PDF back for immediate
 * download alongside the JSON record. Supports degree, internship, course,
 * and competition/achievement certificates via certificateType + typeDetails.
 */
const issueSingleCertificate = asyncHandler(async (req, res) => {
  const { studentName, rollNumber, department, degree, issueDate, certificateType, typeDetails } = req.body;

  const { certificate } = await issueCertificate({
    studentName,
    rollNumber,
    department,
    degree,
    certificateType,
    typeDetails,
    issueDate: issueDate ? new Date(issueDate) : undefined,
    institutionId: req.user.institution._id,
  });

  await AuditLog.create({
    actor: req.user._id,
    actorRole: "institution",
    action: "CERTIFICATE_ISSUED",
    targetType: "Certificate",
    targetId: certificate._id,
    metadata: { certificateId: certificate.certificateId },
  });

  res.status(201).json({ success: true, certificate });
});

/**
 * POST /api/institution/certificates/register-existing
 * multipart/form-data: { file, studentName, rollNumber, department, degree,
 *   certificateType, typeDetails (JSON string), issueDate }
 *
 * For certificates that already exist (old paper certificates that were
 * scanned, or PDFs issued before Credo was adopted). Instead of
 * generating a new certificate PDF, this hashes the uploaded file as-is,
 * generates a QR code + certificateId for it, pins the original file to
 * IPFS, and records the hash on-chain — so it becomes instantly and
 * publicly verifiable through the same /verify flow as newly issued ones.
 */
const registerExisting = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "A certificate file (PDF or image) is required." });
  }

  const { studentName, rollNumber, department, degree, issueDate, certificateType } = req.body;

  let typeDetails = {};
  if (req.body.typeDetails) {
    try {
      typeDetails = typeof req.body.typeDetails === "string" ? JSON.parse(req.body.typeDetails) : req.body.typeDetails;
    } catch {
      return res.status(400).json({ success: false, message: "typeDetails must be valid JSON." });
    }
  }

  const { certificate, qrDataUrl, fileHash } = await registerExistingCertificate({
    studentName,
    rollNumber,
    department,
    degree,
    certificateType,
    typeDetails,
    issueDate: issueDate ? new Date(issueDate) : undefined,
    institutionId: req.user.institution._id,
    fileBuffer: req.file.buffer,
    mimeType: req.file.mimetype,
    originalName: req.file.originalname,
  });

  await AuditLog.create({
    actor: req.user._id,
    actorRole: "institution",
    action: "CERTIFICATE_REGISTERED_EXISTING",
    targetType: "Certificate",
    targetId: certificate._id,
    metadata: { certificateId: certificate.certificateId, fileHash },
  });

  res.status(201).json({ success: true, certificate, qrDataUrl, fileHash });
});

/**
 * POST /api/institution/certificates/bulk-preview
 * Parses an uploaded Excel/CSV file and returns a preview (valid + invalid
 * rows) WITHOUT issuing anything yet — lets the institution review before
 * committing to on-chain writes (which cost gas and can't be undone).
 */
const bulkPreview = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded." });

  const isCSV = req.file.mimetype.includes("csv");
  const result = isCSV
    ? parseCSVBuffer(req.file.buffer)
    : await parseExcelBuffer(req.file.buffer);

  res.json({ success: true, preview: result });
});

/**
 * POST /api/institution/certificates/bulk-issue
 * Body: { records: [{ studentName, rollNumber, department, degree }, ...] }
 * Issues each valid record sequentially (on-chain transactions must be
 * sequential per nonce from a single platform wallet) and returns a
 * per-record result so partial failures are visible rather than silently
 * dropped.
 */
const bulkIssue = asyncHandler(async (req, res) => {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: "No records provided for bulk issuance." });
  }
  if (records.length > 200) {
    return res.status(400).json({
      success: false,
      message: "Bulk issuance is limited to 200 certificates per batch to keep gas costs and request time manageable.",
    });
  }

  const results = [];
  for (const record of records) {
    try {
      const { certificate } = await issueCertificate({
        studentName: record.studentName,
        rollNumber: record.rollNumber,
        department: record.department,
        degree: record.degree,
        institutionId: req.user.institution._id,
      });
      results.push({ rollNumber: record.rollNumber, success: true, certificateId: certificate.certificateId });
    } catch (err) {
      results.push({ rollNumber: record.rollNumber, success: false, error: err.message });
    }
  }

  await AuditLog.create({
    actor: req.user._id,
    actorRole: "institution",
    action: "BULK_UPLOAD",
    metadata: {
      total: records.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    },
  });

  res.status(207).json({ success: true, results });
});

/** GET /api/institution/certificates — issue history, paginated */
const getIssueHistory = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const filter = { institution: req.user.institution._id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    filter.$or = [
      { studentName: new RegExp(req.query.search, "i") },
      { rollNumber: new RegExp(req.query.search, "i") },
      { certificateId: new RegExp(req.query.search, "i") },
    ];
  }

  const [certificates, total] = await Promise.all([
    Certificate.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Certificate.countDocuments(filter),
  ]);

  res.json({
    success: true,
    certificates,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

module.exports = {
  getDashboard,
  getProfile,
  updateProfile,
  previewBranding,
  getCertificateTypes,
  issueSingleCertificate,
  registerExisting,
  bulkPreview,
  bulkIssue,
  getIssueHistory,
};
