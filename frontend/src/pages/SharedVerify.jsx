import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { FiCheckCircle, FiXCircle, FiLock, FiClock } from "react-icons/fi";
import Navbar from "../components/Navbar";
import api from "../services/api";

const LABELS = {
  studentName: "Name", rollNumber: "Roll number", department: "Department", degree: "Credential",
  institution: "Issued by", issueDate: "Issue date", certificateType: "Type", typeDetails: "Details",
};
const fmt = (k, v) => (k === "issueDate" ? new Date(v).toLocaleDateString() : typeof v === "object" ? Object.values(v).filter(Boolean).join(", ") : String(v));

// Verifier view of a student-owned share: only chosen fields, expiring, revocable.
export default function SharedVerify() {
  const { token } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/verify/share/${token}`).then((r) => setData(r.data)).catch((e) => setData(e.response?.data || { found: false }));
  }, [token]);

  const ok = data?.state === "active" && data.valid;
  return (
    <div className="min-h-screen bg-olive-950">
      <Navbar />
      <div className="mx-auto max-w-xl px-6 py-20">
        {!data ? <p className="text-paper/60">Checking blockchain…</p> : data.state === "active" ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
            <div className={`flex items-center gap-2 font-semibold ${ok ? "text-emerald-400" : "text-red-400"}`}>
              {ok ? <FiCheckCircle /> : <FiXCircle />}
              {ok ? "Verified on blockchain" : data.revoked ? "Certificate revoked by issuer" : "Verification failed"}
            </div>
            <dl className="mt-6 space-y-3">
              {Object.entries(data.disclosed).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-white/10 pb-2">
                  <dt className="text-sm text-paper/50">{LABELS[k] || k}</dt>
                  <dd className="text-right text-paper">{fmt(k, v)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 flex items-center gap-2 text-xs text-paper/50"><FiLock /> The holder chose to hide {data.hiddenCount} other detail(s).</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-paper/50"><FiClock /> Link expires {new Date(data.expiresAt).toLocaleString()}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-8 text-paper">
            <FiXCircle className="text-2xl text-red-400" />
            <p className="mt-3">{data.message || "This link is not valid."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
