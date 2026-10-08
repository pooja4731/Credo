import { useState, useRef } from "react";
import { toast } from "react-toastify";
import { FiUploadCloud, FiCheckCircle, FiXCircle, FiFile } from "react-icons/fi";
import { Link } from "react-router-dom";
import api from "../../services/api";
import DashboardShell from "./DashboardShell";

const STEPS = ["upload", "preview", "results"];

export default function BulkUpload() {
  const [step, setStep] = useState("upload");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState(null); // { valid, invalid, totalRows }
  const [issuing, setIssuing] = useState(false);
  const [results, setResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post("/institution/certificates/bulk-preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPreview(data.preview);
      setStep("preview");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not read this file. Check the format and try again.");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const confirmIssue = async () => {
    if (!preview?.valid?.length) return;
    setIssuing(true);
    try {
      const { data } = await api.post("/institution/certificates/bulk-issue", {
        records: preview.valid,
      });
      setResults(data.results);
      setStep("results");
      const succeeded = data.results.filter((r) => r.success).length;
      toast.success(`Issued ${succeeded} of ${data.results.length} certificates.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk issuance failed.");
    } finally {
      setIssuing(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setFileName("");
    setPreview(null);
    setResults(null);
  };

  return (
    <DashboardShell title="Bulk Upload">
      <div className="mb-6 flex items-center gap-2 text-sm text-ink-soft dark:text-paper/60">
        {STEPS.map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                step === s
                  ? "bg-clay-500 text-olive-950 dark:text-paper"
                  : STEPS.indexOf(step) > i
                  ? "bg-verified text-white"
                  : "bg-olive-900/10 text-ink-soft dark:text-paper/60"
              }`}
            >
              {i + 1}
            </span>
            <span className="capitalize">{s}</span>
            {i < STEPS.length - 1 && <span className="mx-1 text-olive-900 dark:text-paper/20">—</span>}
          </span>
        ))}
      </div>

      {step === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-14 text-center transition ${
            dragActive ? "border-clay-500 bg-clay-500/5" : "border-olive-900/20 bg-white dark:bg-olive-900"
          }`}
        >
          <FiUploadCloud className="text-4xl text-olive-900 dark:text-paper/40" />
          <p className="mt-4 font-medium text-olive-950 dark:text-paper">Drag and drop your Excel or CSV file here</p>
          <p className="mt-1 text-sm text-ink-soft dark:text-paper/60">
            Required columns: studentName, rollNumber, department, degree
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-5 rounded-full bg-clay-500 px-6 py-2.5 text-sm font-semibold text-olive-950 dark:text-paper hover:bg-clay-400"
          >
            Choose File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      )}

      {step === "preview" && preview && (
        <div>
          <div className="flex items-center justify-between rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900 p-4">
            <span className="flex items-center gap-2 text-sm text-ink-soft dark:text-paper/60">
              <FiFile /> {fileName} — {preview.totalRows} rows parsed
            </span>
            <button onClick={reset} className="text-sm font-medium text-olive-900 dark:text-paper hover:text-clay-600">
              Upload a different file
            </button>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-verified/20 bg-verified-soft/10 p-4">
              <p className="flex items-center gap-2 font-medium text-verified">
                <FiCheckCircle /> {preview.valid.length} ready to issue
              </p>
            </div>
            <div className="rounded-xl border border-alert/20 bg-alert-soft/10 p-4">
              <p className="flex items-center gap-2 font-medium text-alert">
                <FiXCircle /> {preview.invalid.length} rows have issues
              </p>
            </div>
          </div>

          {preview.invalid.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-olive-900/10 dark:border-white/10 text-xs uppercase text-ink-soft dark:text-paper/60">
                  <tr>
                    <th className="px-4 py-3">Row</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Roll No.</th>
                    <th className="px-4 py-3">Issues</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.invalid.map((r) => (
                    <tr key={r.rowNumber} className="border-b border-olive-900/5 last:border-0">
                      <td className="px-4 py-2 font-mono text-xs">{r.rowNumber}</td>
                      <td className="px-4 py-2">{r.studentName || "—"}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.rollNumber || "—"}</td>
                      <td className="px-4 py-2 text-alert">{r.errors.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.valid.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-olive-900/10 dark:border-white/10 text-xs uppercase text-ink-soft dark:text-paper/60">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Roll No.</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Degree</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.valid.slice(0, 8).map((r) => (
                    <tr key={r.rollNumber} className="border-b border-olive-900/5 last:border-0">
                      <td className="px-4 py-2">{r.studentName}</td>
                      <td className="px-4 py-2 font-mono text-xs">{r.rollNumber}</td>
                      <td className="px-4 py-2">{r.department}</td>
                      <td className="px-4 py-2">{r.degree}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.valid.length > 8 && (
                <p className="border-t border-olive-900/10 dark:border-white/10 px-4 py-2 text-xs text-ink-soft dark:text-paper/60">
                  + {preview.valid.length - 8} more rows
                </p>
              )}
            </div>
          )}

          <button
            onClick={confirmIssue}
            disabled={issuing || preview.valid.length === 0}
            className="mt-6 rounded-full bg-clay-500 px-6 py-2.5 font-semibold text-olive-950 dark:text-paper transition hover:bg-clay-400 disabled:opacity-50"
          >
            {issuing
              ? "Issuing on-chain — this may take a while…"
              : `Issue ${preview.valid.length} Certificate${preview.valid.length === 1 ? "" : "s"}`}
          </button>
          <p className="mt-2 text-xs text-ink-soft dark:text-paper/60">
            Each certificate is written to the blockchain individually. This cannot be undone once issued —
            revoking a certificate afterward requires a separate on-chain transaction.
          </p>
        </div>
      )}

      {step === "results" && results && (
        <div>
          <div className="rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900 p-5">
            <p className="font-medium text-olive-950 dark:text-paper">
              {results.filter((r) => r.success).length} of {results.length} certificates issued successfully.
            </p>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-olive-900/10 dark:border-white/10 text-xs uppercase text-ink-soft dark:text-paper/60">
                <tr>
                  <th className="px-4 py-3">Roll No.</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Detail</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.rollNumber} className="border-b border-olive-900/5 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs">{r.rollNumber}</td>
                    <td className="px-4 py-2">
                      {r.success ? (
                        <span className="flex items-center gap-1 text-verified"><FiCheckCircle /> Issued</span>
                      ) : (
                        <span className="flex items-center gap-1 text-alert"><FiXCircle /> Failed</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{r.certificateId || r.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={reset} className="rounded-full border border-olive-900/15 dark:border-white/15 px-6 py-2.5 text-sm font-medium text-olive-900 dark:text-paper hover:bg-olive-900/5 dark:hover:bg-white/10">
              Upload another file
            </button>
            <Link to="/institution/history" className="rounded-full bg-clay-500 px-6 py-2.5 text-sm font-semibold text-olive-950 dark:text-paper hover:bg-clay-400">
              View Issue History
            </Link>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
