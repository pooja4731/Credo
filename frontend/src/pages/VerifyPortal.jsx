import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiSearch } from "react-icons/fi";
import Navbar from "../components/Navbar";
import api from "../services/api";

export default function VerifyPortal() {
  const [certificateId, setCertificateId] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!certificateId.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const { data } = await api.get(`/verify/${encodeURIComponent(certificateId.trim())}`);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong while verifying. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-olive-950">
      <Navbar />

      <div className="mx-auto max-w-2xl px-6 py-20">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-wide text-clay-400">
            Public Verify Portal
          </span>
          <h1 className="mt-3 font-display text-3xl font-semibold text-paper md:text-4xl">
            Verify a certificate
          </h1>
          <p className="mt-3 text-paper/60">
            Enter a certificate ID to check it against the Ethereum blockchain. No account required.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mt-10 flex gap-3">
          <input
            value={certificateId}
            onChange={(e) => setCertificateId(e.target.value)}
            placeholder="e.g. CRD-2026-CSE-00123"
            className="flex-1 rounded-full border border-white/15 bg-white/5 px-5 py-3.5 font-mono text-sm text-paper placeholder:text-paper/30 focus:border-clay-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-full bg-clay-500 px-6 py-3.5 font-semibold text-olive-950 transition hover:bg-clay-400 disabled:opacity-60"
          >
            <FiSearch /> {loading ? "Checking…" : "Verify"}
          </button>
        </form>

        {error && (
          <p className="mt-6 rounded-xl border border-alert/30 bg-alert-soft/10 px-5 py-4 text-sm text-alert">
            {error}
          </p>
        )}

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8"
            >
              {!result.found ? (
                <ResultCard
                  icon={<FiXCircle />}
                  tone="alert"
                  title="No certificate found"
                  subtitle="No record exists with this certificate ID."
                />
              ) : result.tampered ? (
                <ResultCard
                  icon={<FiAlertTriangle />}
                  tone="alert"
                  title="Tampered — hash mismatch"
                  subtitle="This certificate's on-chain hash does not match its stored record."
                  certificate={result.certificate}
                  blockchain={result.blockchain}
                />
              ) : result.revoked ? (
                <ResultCard
                  icon={<FiXCircle />}
                  tone="alert"
                  title="Revoked"
                  subtitle="This certificate has been revoked by the issuing institution."
                  certificate={result.certificate}
                  blockchain={result.blockchain}
                />
              ) : result.valid ? (
                <ResultCard
                  icon={<FiCheckCircle />}
                  tone="verified"
                  title="Valid certificate"
                  subtitle="This certificate is authentic and verified on-chain."
                  certificate={result.certificate}
                  blockchain={result.blockchain}
                />
              ) : (
                <ResultCard
                  icon={<FiXCircle />}
                  tone="alert"
                  title="Invalid"
                  subtitle="This certificate could not be verified."
                  certificate={result.certificate}
                  blockchain={result.blockchain}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ResultCard({ icon, tone, title, subtitle, certificate, blockchain }) {
  const toneClasses =
    tone === "verified"
      ? "border-verified/30 bg-verified-soft/10 text-verified"
      : "border-alert/30 bg-alert-soft/10 text-alert";

  return (
    <div className={`rounded-2xl border p-6 ${toneClasses}`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <h2 className="font-display text-xl font-semibold">{title}</h2>
          <p className="text-sm opacity-80">{subtitle}</p>
        </div>
      </div>

      {certificate && (
        <>
          <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 text-sm text-paper/80 sm:grid-cols-2">
            <Field label="Student" value={certificate.studentName} />
            <Field label="Institution" value={certificate.institution} />
            <Field label="Department" value={certificate.department} />
            <Field label="Degree / Title" value={certificate.degree} />
            <Field label="Certificate Type" value={TYPE_LABELS[certificate.certificateType] || certificate.certificateType} />
            <Field
              label="Source"
              value={certificate.source === "registered_existing" ? "Registered existing certificate" : "Issued by Credo"}
            />
            <Field label="Certificate ID" value={certificate.certificateId} mono />
            <Field
              label="Issue Date"
              value={certificate.issueDate ? new Date(certificate.issueDate).toLocaleDateString() : "—"}
            />
            {blockchain?.transactionHash && (
              <Field label="Transaction Hash" value={blockchain.transactionHash} mono truncate />
            )}
            {blockchain?.blockNumber != null && (
              <Field label="Block Number" value={String(blockchain.blockNumber)} mono />
            )}
            {certificate.certificateHash && (
              <Field label="Certificate Hash (SHA-256)" value={certificate.certificateHash} mono truncate />
            )}
            {certificate.originalFile?.fileHash && (
              <Field label="Original File Hash (SHA-256)" value={certificate.originalFile.fileHash} mono truncate />
            )}
          </div>

          {/* Type-specific extra details (internship org/role, course name, competition placing, etc.) */}
          {certificate.typeDetails && Object.keys(certificate.typeDetails).length > 0 && (
            <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 text-sm text-paper/80 sm:grid-cols-2">
              {Object.entries(certificate.typeDetails).map(([key, value]) => (
                <Field key={key} label={humanizeKey(key)} value={String(value)} />
              ))}
            </div>
          )}

          {certificate.qrCodeUrl && (
            <div className="mt-5 flex items-center gap-4 border-t border-white/10 pt-5">
              <img src={certificate.qrCodeUrl} alt="Certificate QR code" className="h-24 w-24 rounded-lg bg-white p-2" />
              <p className="text-xs text-paper/50">
                This QR code links directly to this verification result — share it alongside the certificate.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const TYPE_LABELS = {
  degree: "Degree / Completion Certificate",
  internship: "Internship Certificate",
  course: "Course / Training Certificate",
  competition: "Competition / Achievement Certificate",
  other: "Other",
};

function humanizeKey(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function Field({ label, value, mono, truncate }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-paper/40">{label}</dt>
      <dd className={`mt-0.5 text-paper ${mono ? "font-mono text-xs" : ""} ${truncate ? "truncate" : ""}`}>
        {value || "—"}
      </dd>
    </div>
  );
}
