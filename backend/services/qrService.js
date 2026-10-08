const QRCode = require("qrcode");

/**
 * Builds the public verification URL embedded in a certificate's QR code.
 */
function buildVerifyUrl(certificateId) {
  const base = process.env.CLIENT_URL || "http://localhost:5173";
  return `${base}/verify?certificateId=${encodeURIComponent(certificateId)}`;
}

/** Generates a QR code as a PNG buffer (for embedding into the PDF). */
async function generateQRBuffer(certificateId) {
  const url = buildVerifyUrl(certificateId);
  return QRCode.toBuffer(url, {
    type: "png",
    width: 300,
    margin: 1,
    errorCorrectionLevel: "H",
  });
}

/** Generates a QR code as a base64 data URL (for use in the frontend/API responses). */
async function generateQRDataUrl(certificateId) {
  const url = buildVerifyUrl(certificateId);
  return QRCode.toDataURL(url, { errorCorrectionLevel: "H" });
}

module.exports = { buildVerifyUrl, generateQRBuffer, generateQRDataUrl };
