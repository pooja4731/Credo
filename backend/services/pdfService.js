const PDFDocument = require("pdfkit");

const path = require("path");
const ff = (pkg, w) => path.join(__dirname, "..", "node_modules", "@fontsource", pkg, "files", `${pkg}-latin-${w}-normal.woff`);
const custom = (key, pkg) => ({ r: key + "-r", b: key + "-b", files: { r: ff(pkg, 400), b: ff(pkg, 700) } });
const FONTS = {
  helvetica: { r: "Helvetica", b: "Helvetica-Bold" },
  times: { r: "Times-Roman", b: "Times-Bold" },
  courier: { r: "Courier", b: "Courier-Bold" },
  playfair: custom("playfair", "playfair-display"),
  montserrat: custom("montserrat", "montserrat"),
  lora: custom("lora", "lora"),
};
const TITLE_BY_TYPE = {
  degree: "Certificate of Completion",
  internship: "Certificate of Internship",
  course: "Certificate of Course Completion",
  competition: "Certificate of Achievement",
  other: "Certificate",
};

// Readable text colour on top of any brand colour.
function onColor(hex) {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? "#111111" : "#FFFFFF";
}

function logoBuffer(b) {
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(b.logoDataUrl || "");
  return m ? Buffer.from(m[2], "base64") : null;
}

/**
 * Generates a certificate PDF using the institution's own branding
 * (header name, template, font, colours, logo, signatory, footer text).
 * Credo appears only as a small "secured by" line in the footer.
 */
function generateCertificatePDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const raw = data.branding?.toObject ? data.branding.toObject() : data.branding || {};
      const b = {
        template: "classic", fontFamily: "helvetica", primaryColor: "#3F4D20", accentColor: "#C9843F", ...raw,
      };
      const F = FONTS[b.fontFamily] || FONTS.helvetica;
      if (b.template === "elegant" && !raw.fontFamily) b.fontFamily = "times";
      const font = FONTS[b.fontFamily] || F;
      const P = b.primaryColor, A = b.accentColor, GRAY = "#444444";
      const headerName = b.headerName || data.institutionName;
      const hCase = b.headerCase || (b.template === "modern" ? "asis" : "upper");
      const headerText = hCase === "upper" ? headerName.toUpperCase() : hCase === "title" ? headerName.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : headerName;
      const logo = logoBuffer(b) || data.institutionLogoBuffer;

      const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
      const chunks = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const W = doc.page.width, H = doc.page.height;
      const left = b.template === "modern";
      const X = left ? 70 : 0, TW = left ? W - 140 : W, align = left ? "left" : "center";
      const t = (text, y, size, color, bold) =>
        doc.fillColor(color).font(bold ? font.b : font.r).fontSize(size).text(text, X, y, { width: TW, align });
      const baseSize = headerName.length > 40 ? 16 : headerName.length > 28 ? 20 : 26;
      const nameSize = Math.round(baseSize * ({ small: 0.8, large: 1.15 }[b.headerSize] || 1));
      if (font.files) { doc.registerFont(font.r, font.files.r); doc.registerFont(font.b, font.files.b); }

      doc.rect(0, 0, W, H).fill(b.bgColor || "#FFFFFF");
      let contentTop = 150;

      if (b.template === "classic") {
        doc.lineWidth(6).strokeColor(P).rect(20, 20, W - 40, H - 40).stroke();
        doc.lineWidth(2).strokeColor(A).rect(32, 32, W - 64, H - 64).stroke();
        doc.rect(32, 32, W - 64, 90).fill(P);
        if (logo) try { doc.image(logo, 55, 45, { fit: [60, 60] }); } catch (_) {}
        const fg = onColor(P);
        doc.fillColor(fg).font(font.b).fontSize(nameSize).text(headerText, 0, 52, { width: W, align: "center" });
        doc.font(font.r).fontSize(11).fillColor(A).text(b.tagline || "Blockchain-Verified Digital Credential", 0, 52 + nameSize + 8, { width: W, align: "center" });
      } else if (b.template === "modern") {
        doc.rect(0, 0, W, 16).fill(P);
        doc.rect(0, 16, W, 4).fill(A);
        if (logo) try { doc.image(logo, 70, 44, { fit: [56, 56] }); } catch (_) {}
        const nx = logo ? 140 : 70;
        doc.fillColor(P).font(font.b).fontSize(nameSize).text(headerText, nx, 52, { width: W - nx - 70, align: "left" });
        doc.font(font.r).fontSize(11).fillColor(A).text(b.tagline || "Blockchain-Verified Digital Credential", nx, 52 + nameSize + 8, { width: W - nx - 70 });
        contentTop = 140;
      } else {
        doc.lineWidth(1.5).strokeColor(A).rect(24, 24, W - 48, H - 48).stroke();
        doc.lineWidth(0.6).strokeColor(A).rect(32, 32, W - 64, H - 64).stroke();
        if (logo) try { doc.image(logo, W / 2 - 25, 44, { fit: [50, 50] }); } catch (_) {}
        const y0 = logo ? 98 : 54;
        doc.fillColor(P).font(font.b).fontSize(nameSize).text(headerText, 0, y0, { width: W, align: "center", characterSpacing: 2 });
        doc.font(font.r).fontSize(11).fillColor(A).text(b.tagline || "Blockchain-Verified Digital Credential", 0, y0 + nameSize + 8, { width: W, align: "center" });
        contentTop = y0 + nameSize + 40;
      }

      const type = data.certificateType || "degree";
      const td = data.typeDetails || {};
      let l1 = `(Roll Number: ${data.rollNumber})  has successfully completed the requirements for`;
      let l2 = `${data.degree} in ${data.department}`;
      if (type === "internship") {
        l1 = `(Roll Number: ${data.rollNumber})  has successfully completed an internship as`;
        l2 = `${td.role || "Intern"} at ${td.organization || data.institutionName}`;
      } else if (type === "course") {
        l1 = `(Roll Number: ${data.rollNumber})  has successfully completed the course`;
        l2 = td.courseName || data.degree;
      } else if (type === "competition") {
        l1 = `(Roll Number: ${data.rollNumber})  has participated in / achieved recognition in`;
        l2 = `${td.eventName || data.degree}${td.position ? ` — ${td.position}` : ""}`;
      }

      let y = Math.max(contentTop, 140);
      t(b.certificateTitle || TITLE_BY_TYPE[type] || TITLE_BY_TYPE.degree, y, 22, P, true); y += 40;
      t("This is to certify that", y, 12, GRAY); y += 22;
      t(data.studentName, y, 28, P, true); y += 40;
      t(l1, y, 12, GRAY); y += 23;
      t(l2, y, 18, P, true); y += 30;
      t(`awarded by ${data.institutionName}`, y, 12, GRAY); y += 25;
      const d = new Date(data.issueDate).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
      t(`Date of Issue: ${d}`, y, 11, GRAY);

      const footerY = H - 150;
      if (b.signatoryName) {
        const sx = W - 300;
        doc.moveTo(sx, footerY - 40).lineTo(sx + 200, footerY - 40).strokeColor(P).lineWidth(0.8).stroke();
        doc.fillColor(P).font(font.b).fontSize(11).text(b.signatoryName, sx, footerY - 34, { width: 200, align: "center" });
        if (b.signatoryTitle) doc.fillColor(GRAY).font(font.r).fontSize(9).text(b.signatoryTitle, sx, footerY - 19, { width: 200, align: "center" });
      }
      doc.moveTo(60, footerY).lineTo(W - 60, footerY).strokeColor("#CCCCCC").lineWidth(1).stroke();
      const hash = `${data.certificateHash.slice(0, 20)}...${data.certificateHash.slice(-10)}`;
      doc.fillColor(GRAY).font(font.b).fontSize(9).text(`Certificate ID: ${data.certificateId}`, 60, footerY + 15);
      doc.font(font.r).text(`Blockchain Hash: ${hash}`, 60, footerY + 32);
      doc.text("Secured on the Ethereum blockchain by Credo. Scan the QR code to verify.", 60, footerY + 49);
      if (b.footerText) doc.fillColor(A).text(b.footerText, 60, footerY + 66, { width: W - 260 });
      if (data.qrCodeBuffer) doc.image(data.qrCodeBuffer, W - 160, footerY + 5, { width: 90, height: 90 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateCertificatePDF };
