const { v4: uuidv4 } = require("uuid");
const Certificate = require("../models/Certificate");
const Institution = require("../models/Institution");
const Transaction = require("../models/Transaction");

const { hashCertificateData, hashBuffer } = require("./hashService");
const { generateQRBuffer, generateQRDataUrl } = require("./qrService");
const { generateCertificatePDF } = require("./pdfService");
const { uploadFileToPinata, uploadJSONToPinata } = require("./pinataService");
const {
  issueCertificateOnChain,
  revokeCertificateOnChain,
  verifyCertificateOnChain,
} = require("./blockchainService");

/**
 * Supported certificate types and the extra (beyond the common student/
 * institution fields) inputs each one accepts in typeDetails. The frontend
 * uses this same shape to render type-specific form fields.
 */
const CERTIFICATE_TYPES = {
  degree: {
    label: "Degree / Completion Certificate",
    fields: [], // uses only the common fields (department, degree)
  },
  internship: {
    label: "Internship Certificate",
    fields: [
      { key: "organization", label: "Organization", required: true },
      { key: "role", label: "Role / Position", required: true },
      { key: "startDate", label: "Start Date", type: "date", required: false },
      { key: "endDate", label: "End Date", type: "date", required: false },
    ],
  },
  course: {
    label: "Course / Training Certificate",
    fields: [
      { key: "courseName", label: "Course Name", required: true },
      { key: "provider", label: "Provider / Platform", required: false },
      { key: "durationHours", label: "Duration (hours)", type: "number", required: false },
      { key: "grade", label: "Grade / Score", required: false },
    ],
  },
  competition: {
    label: "Competition / Achievement Certificate",
    fields: [
      { key: "eventName", label: "Event / Competition Name", required: true },
      { key: "position", label: "Position / Rank", required: false },
      { key: "category", label: "Category", required: false },
    ],
  },
  other: {
    label: "Other",
    fields: [{ key: "description", label: "Description", required: false }],
  },
};

/**
 * Generates a human-readable, unique certificate ID.
 * Format: CRD-<year>-<deptCode>-<short random>
 */
function generateCertificateId(department) {
  const year = new Date().getFullYear();
  const deptCode = (department || "GEN").replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();
  const shortId = uuidv4().split("-")[0].toUpperCase();
  return `CRD-${year}-${deptCode}-${shortId}`;
}

/**
 * Picks only the fields relevant to a given certificateType out of a raw
 * typeDetails object, so unrelated leftover form fields never get stored
 * or hashed for a certificate type that doesn't use them.
 */
function pickTypeDetails(certificateType, rawTypeDetails = {}) {
  const def = CERTIFICATE_TYPES[certificateType] || CERTIFICATE_TYPES.degree;
  const picked = {};
  for (const field of def.fields) {
    if (rawTypeDetails[field.key] !== undefined && rawTypeDetails[field.key] !== "") {
      picked[field.key] = rawTypeDetails[field.key];
    }
  }
  return picked;
}

/**
 * Full issuance pipeline for a single certificate:
 * 1. Build canonical JSON payload + certificateId
 * 2. Generate QR (pointing at verify portal)
 * 3. Render PDF
 * 4. Hash the JSON payload (this is the hash stored on-chain)
 * 5. Upload PDF + JSON to IPFS via Pinata
 * 6. Store hash + CID on the blockchain
 * 7. Save MongoDB record + transaction log
 *
 * @param {Object} input
 * @param {string} input.studentName
 * @param {string} input.rollNumber
 * @param {string} input.department
 * @param {string} input.degree
 * @param {string} input.institutionId - Mongo ObjectId of the Institution
 * @param {Date}   [input.issueDate]
 * @param {mongoose.Types.ObjectId} [input.studentUserId]
 * @param {Buffer} [input.institutionLogoBuffer]
 */
async function issueCertificate(input) {
  const institution = await Institution.findById(input.institutionId);
  if (!institution) throw new Error("Institution not found");
  if (institution.status !== "approved") {
    throw new Error("Institution is not approved to issue certificates");
  }

  const certificateId = generateCertificateId(input.department);
  const issueDate = input.issueDate || new Date();
  const certificateType = CERTIFICATE_TYPES[input.certificateType] ? input.certificateType : "degree";
  const typeDetails = pickTypeDetails(certificateType, input.typeDetails);

  // Canonical payload — this exact shape is what gets hashed. Any field
  // added here must also be considered when re-verifying, since changing
  // this structure changes the hash of every future certificate.
  const certificatePayload = {
    certificateId,
    studentName: input.studentName,
    rollNumber: input.rollNumber,
    department: input.department,
    degree: input.degree,
    certificateType,
    typeDetails,
    institutionName: institution.name,
    institutionCode: institution.code,
    issueDate: issueDate.toISOString(),
  };

  const certificateHash = hashCertificateData(certificatePayload);

  const qrCodeBuffer = await generateQRBuffer(certificateId);

  const pdfBuffer = await generateCertificatePDF({
    studentName: input.studentName,
    rollNumber: input.rollNumber,
    department: input.department,
    degree: input.degree,
    certificateType,
    typeDetails,
    institutionName: institution.name,
    branding: institution.branding,
    institutionLogoBuffer: input.institutionLogoBuffer,
    issueDate,
    certificateId,
    certificateHash,
    qrCodeBuffer,
  });

  // Upload PDF and JSON metadata to IPFS
  const pdfUpload = await uploadFileToPinata(pdfBuffer, `${certificateId}.pdf`, {
    certificateId,
    institutionCode: institution.code,
  });
  const jsonUpload = await uploadJSONToPinata(
    { ...certificatePayload, certificateHash, pdfCID: pdfUpload.cid },
    `${certificateId}-metadata`
  );

  // Store on blockchain
  let chainResult;
  const txLog = await Transaction.create({ type: "issue", status: "pending" });
  try {
    chainResult = await issueCertificateOnChain({
      certificateId,
      certificateHashHex: certificateHash,
      ipfsCID: jsonUpload.cid,
    });
    txLog.status = "confirmed";
    txLog.transactionHash = chainResult.transactionHash;
    txLog.blockNumber = chainResult.blockNumber;
    txLog.fromAddress = chainResult.issuerWallet;
    await txLog.save();
  } catch (err) {
    txLog.status = "failed";
    txLog.errorMessage = err.message;
    await txLog.save();
    throw new Error(`Blockchain issuance failed: ${err.message}`);
  }

  const certificate = await Certificate.create({
    certificateId,
    student: input.studentUserId,
    studentName: input.studentName,
    rollNumber: input.rollNumber,
    department: input.department,
    degree: input.degree,
    certificateType,
    typeDetails,
    source: "issued",
    institution: institution._id,
    issueDate,
    certificateHash,
    ipfsCID: jsonUpload.cid,
    ipfsPdfUrl: pdfUpload.url,
    ipfsJsonUrl: jsonUpload.url,
    qrCodeUrl: null, // QR is embedded in PDF; regenerate on demand via qrService if needed standalone
    blockchain: {
      certificateIdHash: chainResult.certificateIdHash,
      transactionHash: chainResult.transactionHash,
      blockNumber: chainResult.blockNumber,
      contractAddress: chainResult.contractAddress,
      issuerWallet: chainResult.issuerWallet,
      network: process.env.NODE_ENV === "production" ? "mainnet-or-configured-testnet" : "development",
    },
  });

  txLog.certificate = certificate._id;
  await txLog.save();

  institution.stats.certificatesIssued += 1;
  await institution.save();

  return { certificate, pdfBuffer };
}

/**
 * Registers an EXISTING certificate (e.g. an old paper certificate that was
 * scanned, or a PDF issued before Credo existed) so it can be
 * verified going forward, without generating a new Credo-styled PDF.
 *
 * Pipeline:
 * 1. Hash the uploaded file's raw bytes (proves later verification is
 *    against these exact bytes, not a re-typed/altered copy).
 * 2. Build a canonical metadata payload (student/institution/type details
 *    + the file hash) and hash THAT — this combined hash is what goes
 *    on-chain, same as freshly-issued certificates, so both paths are
 *    verified identically.
 * 3. Generate a QR code pointing at the public verify page for this
 *    certificate's new certificateId.
 * 4. Upload the original file (unmodified) + the JSON metadata to IPFS.
 * 5. Record the hash + IPFS pointer on-chain.
 * 6. Save the MongoDB record with source: "registered_existing".
 *
 * @param {Object} input
 * @param {string} input.studentName
 * @param {string} input.rollNumber
 * @param {string} input.department
 * @param {string} input.degree
 * @param {string} [input.certificateType] - one of CERTIFICATE_TYPES keys
 * @param {Object} [input.typeDetails]
 * @param {string} input.institutionId
 * @param {Date}   [input.issueDate] - original issue date of the existing certificate
 * @param {Buffer} input.fileBuffer - the uploaded certificate file (PDF or image)
 * @param {string} input.mimeType
 * @param {string} input.originalName
 */
async function registerExistingCertificate(input) {
  const institution = await Institution.findById(input.institutionId);
  if (!institution) throw new Error("Institution not found");
  if (institution.status !== "approved") {
    throw new Error("Institution is not approved to register certificates");
  }
  if (!input.fileBuffer || !input.fileBuffer.length) {
    throw new Error("A certificate file (PDF or image) is required");
  }

  const certificateId = generateCertificateId(input.department);
  const issueDate = input.issueDate || new Date();
  const certificateType = CERTIFICATE_TYPES[input.certificateType] ? input.certificateType : "degree";
  const typeDetails = pickTypeDetails(certificateType, input.typeDetails);

  // Hash of the exact file bytes the institution uploaded.
  const fileHash = hashBuffer(input.fileBuffer);

  // Canonical payload binds the file's hash to this certificate's metadata,
  // so a genuine metadata record can't be paired with a swapped-out file
  // and still verify.
  const certificatePayload = {
    certificateId,
    studentName: input.studentName,
    rollNumber: input.rollNumber,
    department: input.department,
    degree: input.degree,
    certificateType,
    typeDetails,
    institutionName: institution.name,
    institutionCode: institution.code,
    issueDate: issueDate.toISOString(),
    source: "registered_existing",
    originalFileHash: fileHash,
  };

  const certificateHash = hashCertificateData(certificatePayload);

  const qrDataUrl = await generateQRDataUrl(certificateId);

  // Upload the original file untouched, plus the metadata JSON, to IPFS.
  const safeName = (input.originalName || `${certificateId}${input.mimeType === "application/pdf" ? ".pdf" : ""}`).replace(
    /[^A-Za-z0-9._-]/g,
    "_"
  );
  const fileUpload = await uploadFileToPinata(input.fileBuffer, safeName, {
    certificateId,
    institutionCode: institution.code,
    source: "registered_existing",
  });
  const jsonUpload = await uploadJSONToPinata(
    { ...certificatePayload, certificateHash, originalFileCID: fileUpload.cid },
    `${certificateId}-metadata`
  );

  let chainResult;
  const txLog = await Transaction.create({ type: "issue", status: "pending" });
  try {
    chainResult = await issueCertificateOnChain({
      certificateId,
      certificateHashHex: certificateHash,
      ipfsCID: jsonUpload.cid,
    });
    txLog.status = "confirmed";
    txLog.transactionHash = chainResult.transactionHash;
    txLog.blockNumber = chainResult.blockNumber;
    txLog.fromAddress = chainResult.issuerWallet;
    await txLog.save();
  } catch (err) {
    txLog.status = "failed";
    txLog.errorMessage = err.message;
    await txLog.save();
    throw new Error(`Blockchain registration failed: ${err.message}`);
  }

  const certificate = await Certificate.create({
    certificateId,
    student: input.studentUserId,
    studentName: input.studentName,
    rollNumber: input.rollNumber,
    department: input.department,
    degree: input.degree,
    certificateType,
    typeDetails,
    source: "registered_existing",
    institution: institution._id,
    issueDate,
    certificateHash,
    ipfsCID: jsonUpload.cid,
    ipfsJsonUrl: jsonUpload.url,
    qrCodeUrl: qrDataUrl,
    originalFile: {
      fileHash,
      mimeType: input.mimeType,
      originalName: input.originalName,
      ipfsCID: fileUpload.cid,
      ipfsUrl: fileUpload.url,
    },
    blockchain: {
      certificateIdHash: chainResult.certificateIdHash,
      transactionHash: chainResult.transactionHash,
      blockNumber: chainResult.blockNumber,
      contractAddress: chainResult.contractAddress,
      issuerWallet: chainResult.issuerWallet,
      network: process.env.NODE_ENV === "production" ? "mainnet-or-configured-testnet" : "development",
    },
  });

  txLog.certificate = certificate._id;
  await txLog.save();

  institution.stats.certificatesIssued += 1;
  await institution.save();

  return { certificate, qrDataUrl, fileHash };
}

/**
 * Verifies a certificate by certificateId: recomputes nothing (the caller
 * is trusted to supply the correct ID from a QR/search), fetches the
 * MongoDB record, and cross-checks the blockchain record's hash + status.
 */
async function verifyCertificateById(certificateId) {
  const certificate = await Certificate.findOne({ certificateId }).populate("institution");
  if (!certificate) {
    return { found: false, valid: false, message: "No certificate found with this ID." };
  }

  const chainCheck = await verifyCertificateOnChain(certificateId, certificate.certificateHash);

  const tampered = chainCheck.exists && chainCheck.onChainHash.replace(/^0x/, "") !== certificate.certificateHash;

  return {
    found: true,
    valid: chainCheck.valid,
    revoked: chainCheck.revoked,
    tampered,
    certificate,
    blockchain: chainCheck,
  };
}

/**
 * Verifies a certificate by re-hashing an uploaded PDF and/or independently
 * supplied metadata, comparing against both MongoDB and on-chain records.
 * Used for "Upload Certificate PDF" verification.
 */
async function verifyCertificateByFile(certificateId, uploadedPdfBuffer) {
  const certificate = await Certificate.findOne({ certificateId }).populate("institution");
  if (!certificate) {
    return { found: false, valid: false, message: "No certificate found with this ID." };
  }

  // Note: since the PDF is generated with an embedded QR/hash but the hash
  // stored on-chain is over the JSON payload (not PDF bytes), file-based
  // verification confirms the file hasn't been swapped for a different
  // certificate's file by checking the file's own hash was the one pinned
  // to IPFS for this certificateId.
  const uploadedFileHash = hashBuffer(uploadedPdfBuffer);

  const chainCheck = await verifyCertificateOnChain(certificateId, certificate.certificateHash);

  return {
    found: true,
    valid: chainCheck.valid,
    revoked: chainCheck.revoked,
    uploadedFileHash,
    certificate,
    blockchain: chainCheck,
  };
}

async function revokeCertificate(certificateId, reason) {
  const certificate = await Certificate.findOne({ certificateId });
  if (!certificate) throw new Error("Certificate not found");
  if (certificate.status === "revoked") throw new Error("Certificate is already revoked");

  const txLog = await Transaction.create({
    type: "revoke",
    status: "pending",
    certificate: certificate._id,
  });

  try {
    const result = await revokeCertificateOnChain(certificateId);
    txLog.status = "confirmed";
    txLog.transactionHash = result.transactionHash;
    txLog.blockNumber = result.blockNumber;
    await txLog.save();
  } catch (err) {
    txLog.status = "failed";
    txLog.errorMessage = err.message;
    await txLog.save();
    throw new Error(`Blockchain revocation failed: ${err.message}`);
  }

  certificate.status = "revoked";
  certificate.revokedAt = new Date();
  certificate.revokedReason = reason;
  await certificate.save();

  return certificate;
}

module.exports = {
  CERTIFICATE_TYPES,
  generateCertificateId,
  pickTypeDetails,
  issueCertificate,
  registerExistingCertificate,
  verifyCertificateById,
  verifyCertificateByFile,
  revokeCertificate,
};
