import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { FiUploadCloud, FiClock, FiFilePlus, FiFileText, FiCopy } from "react-icons/fi";
import api from "../../services/api";
import DashboardShell from "./DashboardShell";

// Fallback shown before /institution/certificates/types responds, and used
// if that call ever fails — keeps the form usable either way.
const DEFAULT_TYPES = {
  degree: { label: "Degree / Completion Certificate", fields: [] },
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

export default function InstitutionDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [certTypes, setCertTypes] = useState(DEFAULT_TYPES);
  const [activePanel, setActivePanel] = useState("issue"); // "issue" | "register"

  const loadDashboard = async () => {
    try {
      const { data } = await api.get("/institution/dashboard");
      setDashboard(data.dashboard);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load dashboard.");
    }
  };

  const loadCertTypes = async () => {
    try {
      const { data } = await api.get("/institution/certificates/types");
      if (data?.types) setCertTypes(data.types);
    } catch {
      // Silently keep DEFAULT_TYPES — this endpoint being unreachable
      // shouldn't block the form from working.
    }
  };

  useEffect(() => {
    loadDashboard();
    loadCertTypes();
  }, []);

  return (
    <DashboardShell title="Institution Dashboard">
      {dashboard && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Certificates Issued" value={dashboard.certificatesIssued} />
          <StatCard label="Pending" value={dashboard.pending} />
          <StatCard label="Students" value={dashboard.students} />
          <StatCard label="Downloads" value={dashboard.downloads} />
        </div>
      )}

      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          to="/institution/bulk-upload"
          className="flex items-center gap-2 rounded-full bg-olive-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-olive-800"
        >
          <FiUploadCloud /> Bulk Upload
        </Link>
        <Link
          to="/institution/history"
          className="flex items-center gap-2 rounded-full border border-olive-900/15 dark:border-white/15 px-5 py-2.5 text-sm font-medium text-olive-900 dark:text-paper hover:bg-olive-900/5 dark:hover:bg-white/10"
        >
          <FiClock /> Issue History
        </Link>
        <Link
          to="/institution/profile"
          className="flex items-center gap-2 rounded-full border border-olive-900/15 dark:border-white/15 px-5 py-2.5 text-sm font-medium text-olive-900 dark:text-paper hover:bg-olive-900/5 dark:hover:bg-white/10"
        >
          Profile
        </Link>
      </div>

      {/* Panel switcher: issue a brand-new certificate, or register one that
          already exists (old paper certificate / legacy PDF) so it becomes
          verifiable too. */}
      <div className="mb-5 flex gap-2 rounded-full bg-olive-900/5 dark:bg-white/5 p-1 w-fit">
        <button
          type="button"
          onClick={() => setActivePanel("issue")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            activePanel === "issue"
              ? "bg-white dark:bg-olive-900 text-olive-950 dark:text-paper shadow"
              : "text-ink-soft dark:text-paper/60"
          }`}
        >
          <FiFilePlus /> Issue New
        </button>
        <button
          type="button"
          onClick={() => setActivePanel("register")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
            activePanel === "register"
              ? "bg-white dark:bg-olive-900 text-olive-950 dark:text-paper shadow"
              : "text-ink-soft dark:text-paper/60"
          }`}
        >
          <FiFileText /> Register Existing Certificate
        </button>
      </div>

      {activePanel === "issue" ? (
        <IssueNewPanel certTypes={certTypes} onIssued={loadDashboard} />
      ) : (
        <RegisterExistingPanel certTypes={certTypes} onRegistered={loadDashboard} />
      )}
    </DashboardShell>
  );
}

/* ----------------------------------------------------------------------- */
/* Issue a brand-new certificate (degree / internship / course / etc.)     */
/* ----------------------------------------------------------------------- */

function IssueNewPanel({ certTypes, onIssued }) {
  const [certificateType, setCertificateType] = useState("degree");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const typeDef = certTypes[certificateType] || { fields: [] };

  const onIssue = async (values) => {
    const { studentName, rollNumber, department, degree, issueDate, ...rest } = values;

    // Anything not one of the common fields belongs to typeDetails.
    const typeDetails = {};
    typeDef.fields.forEach((f) => {
      if (rest[f.key] !== undefined && rest[f.key] !== "") typeDetails[f.key] = rest[f.key];
    });

    try {
      const { data } = await api.post("/institution/certificates/issue", {
        studentName,
        rollNumber,
        department,
        degree,
        issueDate: issueDate || undefined,
        certificateType,
        typeDetails,
      });
      toast.success(`Certificate ${data.certificate.certificateId} issued.`);
      reset();
    } catch (err) {
      toast.error(err.response?.data?.message || "Issuance failed.");
    } finally {
      onIssued();
    }
  };

  return (
    <div className="rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900 p-6">
      <h2 className="font-display text-lg font-semibold text-olive-950 dark:text-paper">Issue a Single Certificate</h2>
      <p className="mt-1 text-sm text-ink-soft dark:text-paper/60">
        For multiple students at once, use Bulk Upload above instead of entering records one by one.
      </p>

      <div className="mt-5">
        <label className="text-xs font-medium text-ink-soft dark:text-paper/60">Certificate type</label>
        <select
          value={certificateType}
          onChange={(e) => setCertificateType(e.target.value)}
          className={inputClass}
        >
          {Object.entries(certTypes).map(([key, def]) => (
            <option key={key} value={key}>
              {def.label}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit(onIssue)} className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Student name" error={errors.studentName}>
          <input {...register("studentName", { required: "Required" })} className={inputClass} />
        </Field>
        <Field label="Roll number" error={errors.rollNumber}>
          <input {...register("rollNumber", { required: "Required" })} className={inputClass} />
        </Field>
        <Field label="Department" error={errors.department}>
          <input {...register("department", { required: "Required" })} className={inputClass} />
        </Field>
        <Field label="Degree / Title" error={errors.degree}>
          <input
            {...register("degree", { required: "Required" })}
            placeholder={
              certificateType === "degree"
                ? "e.g. B.Tech"
                : certificateType === "course"
                ? "e.g. Full-Stack Web Development"
                : "Title shown on the certificate"
            }
            className={inputClass}
          />
        </Field>
        <Field label="Issue date (optional)">
          <input type="date" {...register("issueDate")} className={inputClass} />
        </Field>

        {/* Type-specific fields, rendered dynamically from certTypes */}
        {typeDef.fields.map((f) => (
          <Field key={f.key} label={f.label} error={errors[f.key]}>
            <input
              type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
              {...register(f.key, f.required ? { required: "Required" } : {})}
              className={inputClass}
            />
          </Field>
        ))}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-clay-500 px-6 py-2.5 font-semibold text-olive-950 dark:text-paper transition hover:bg-clay-400 disabled:opacity-60"
          >
            {isSubmitting ? "Issuing…" : "Issue Certificate"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Register an existing / legacy certificate — hash it, generate a QR,     */
/* and make it instantly and publicly verifiable.                         */
/* ----------------------------------------------------------------------- */

function RegisterExistingPanel({ certTypes, onRegistered }) {
  const [certificateType, setCertificateType] = useState("degree");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null); // { certificate, qrDataUrl, fileHash }
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const typeDef = certTypes[certificateType] || { fields: [] };

  const onRegister = async (values) => {
    if (!file) {
      toast.error("Please attach the existing certificate file (PDF, PNG, or JPG).");
      return;
    }

    const { studentName, rollNumber, department, degree, issueDate, ...rest } = values;
    const typeDetails = {};
    typeDef.fields.forEach((f) => {
      if (rest[f.key] !== undefined && rest[f.key] !== "") typeDetails[f.key] = rest[f.key];
    });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("studentName", studentName);
    formData.append("rollNumber", rollNumber);
    formData.append("department", department);
    formData.append("degree", degree);
    if (issueDate) formData.append("issueDate", issueDate);
    formData.append("certificateType", certificateType);
    formData.append("typeDetails", JSON.stringify(typeDetails));

    try {
      const { data } = await api.post("/institution/certificates/register-existing", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Existing certificate registered as ${data.certificate.certificateId}.`);
      setResult(data);
      reset();
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed.");
    } finally {
      onRegistered();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.info("Copied to clipboard.");
  };

  return (
    <div className="rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900 p-6">
      <h2 className="font-display text-lg font-semibold text-olive-950 dark:text-paper">
        Register an Existing Certificate
      </h2>
      <p className="mt-1 text-sm text-ink-soft dark:text-paper/60">
        Already have a certificate — an old paper certificate you scanned, or a PDF issued before Credo?
        Upload it here. Credo will hash the file, generate a QR code and a certificate ID for it, and record
        it on-chain so it becomes instantly and publicly verifiable — without changing the original document.
      </p>

      <div className="mt-5">
        <label className="text-xs font-medium text-ink-soft dark:text-paper/60">Certificate type</label>
        <select
          value={certificateType}
          onChange={(e) => setCertificateType(e.target.value)}
          className={inputClass}
        >
          {Object.entries(certTypes).map(([key, def]) => (
            <option key={key} value={key}>
              {def.label}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit(onRegister)} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-ink-soft dark:text-paper/60">Certificate file (PDF, PNG, JPG)</label>
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className={`${inputClass} py-2`}
          />
          {file && <p className="mt-1 text-xs text-ink-soft dark:text-paper/60">Selected: {file.name}</p>}
        </div>

        <Field label="Student name" error={errors.studentName}>
          <input {...register("studentName", { required: "Required" })} className={inputClass} />
        </Field>
        <Field label="Roll number" error={errors.rollNumber}>
          <input {...register("rollNumber", { required: "Required" })} className={inputClass} />
        </Field>
        <Field label="Department" error={errors.department}>
          <input {...register("department", { required: "Required" })} className={inputClass} />
        </Field>
        <Field label="Degree / Title" error={errors.degree}>
          <input {...register("degree", { required: "Required" })} className={inputClass} />
        </Field>
        <Field label="Original issue date (optional)">
          <input type="date" {...register("issueDate")} className={inputClass} />
        </Field>

        {typeDef.fields.map((f) => (
          <Field key={f.key} label={f.label} error={errors[f.key]}>
            <input
              type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
              {...register(f.key, f.required ? { required: "Required" } : {})}
              className={inputClass}
            />
          </Field>
        ))}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-clay-500 px-6 py-2.5 font-semibold text-olive-950 dark:text-paper transition hover:bg-clay-400 disabled:opacity-60"
          >
            {isSubmitting ? "Registering…" : "Register & Generate QR"}
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-6 flex flex-col gap-4 rounded-xl border border-verified/30 bg-verified-soft/10 p-5 sm:flex-row sm:items-start">
          {result.qrDataUrl && (
            <img src={result.qrDataUrl} alt="Certificate QR code" className="h-32 w-32 rounded-lg bg-white p-2" />
          )}
          <div className="flex-1 text-sm text-olive-950 dark:text-paper">
            <p className="font-semibold">Certificate registered and verifiable.</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-ink-soft dark:text-paper/60">Certificate ID:</span>
              <span className="font-mono">{result.certificate.certificateId}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(result.certificate.certificateId)}
                className="text-ink-soft hover:text-olive-900 dark:hover:text-paper"
                aria-label="Copy certificate ID"
              >
                <FiCopy size={14} />
              </button>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-ink-soft dark:text-paper/60">File hash (SHA-256):</span>
              <span className="font-mono text-xs truncate">{result.fileHash}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(result.fileHash)}
                className="text-ink-soft hover:text-olive-900 dark:hover:text-paper"
                aria-label="Copy file hash"
              >
                <FiCopy size={14} />
              </button>
            </div>
            <p className="mt-2 text-xs text-ink-soft dark:text-paper/60">
              Share the QR code with the certificate, or the certificate ID directly — either lets anyone verify it
              instantly at the public Verify page.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-olive-900/15 dark:border-white/15 bg-paper dark:bg-olive-950 px-4 py-2.5 text-olive-950 dark:text-paper focus:border-clay-500";

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-ink-soft dark:text-paper/60">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-alert">{error.message}</p>}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900 p-5">
      <div className="font-mono text-2xl font-semibold text-olive-900 dark:text-paper">{value}</div>
      <div className="mt-1 text-xs text-ink-soft dark:text-paper/60">{label}</div>
    </div>
  );
}
