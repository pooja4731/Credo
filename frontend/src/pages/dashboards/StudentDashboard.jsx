import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FiDownload, FiShare2, FiX, FiSmartphone } from "react-icons/fi";
import api from "../../services/api";
import DashboardShell from "./DashboardShell";

export default function StudentDashboard() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/student/certificates")
      .then(({ data }) => setCertificates(data.certificates))
      .catch((err) => toast.error(err.response?.data?.message || "Failed to load certificates."))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (id) => {
    try {
      const { data } = await api.get(`/student/certificates/${id}/download`);
      window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(err.response?.data?.message || "Download failed.");
    }
  };

  const FIELDS = [["degree", "Credential"], ["institution", "Institution"], ["issueDate", "Issue date"], ["studentName", "Name"], ["department", "Department"], ["rollNumber", "Roll number"]];
  const [modal, setModal] = useState(null); // certificate being shared
  const [fields, setFields] = useState(["degree", "institution"]);
  const [hours, setHours] = useState(24);
  const [label, setLabel] = useState("");
  const [shares, setShares] = useState([]);
  const [created, setCreated] = useState(null);
  const [pass, setPass] = useState(null);

  const loadShares = () => api.get("/student/shares").then(({ data }) => setShares(data.shares)).catch(() => {});
  useEffect(() => { loadShares(); }, []);

  const createShare = async () => {
    try {
      const { data } = await api.post(`/student/certificates/${modal._id}/shares`, { fields, hours, label });
      await navigator.clipboard.writeText(data.url).catch(() => {});
      setCreated(data);
      loadShares();
      toast.success("Link created and copied.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not create share link.");
    }
  };
  const revoke = async (id) => {
    await api.delete(`/student/shares/${id}`);
    toast.success("Access revoked.");
    loadShares();
  };
  const showPass = async (id) => {
    const { data } = await api.get(`/student/certificates/${id}/offline-pass`);
    setPass(data);
  };
  const handleShare = (cert) => { setModal(cert); setCreated(null); };

  return (
    <DashboardShell title="My Certificates">
      {loading ? (
        <p className="text-ink-soft dark:text-paper/60">Loading…</p>
      ) : certificates.length === 0 ? (
        <p className="text-ink-soft dark:text-paper/60">No certificates issued to you yet.</p>
      ) : (
        <div className="space-y-3">
          {certificates.map((cert) => (
            <div
              key={cert._id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900 p-5"
            >
              <div>
                <p className="font-medium text-olive-950 dark:text-paper">{cert.degree} — {cert.department}</p>
                <p className="text-xs text-ink-soft dark:text-paper/60">
                  {cert.institution?.name} · <span className="font-mono">{cert.certificateId}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDownload(cert._id)}
                  className="flex items-center gap-1.5 rounded-full border border-olive-900/15 dark:border-white/15 px-4 py-1.5 text-sm font-medium text-olive-900 dark:text-paper hover:bg-olive-900/5 dark:hover:bg-white/10"
                >
                  <FiDownload /> Download
                </button>
                <button
                  onClick={() => handleShare(cert)}
                  className="flex items-center gap-1.5 rounded-full border border-olive-900/15 dark:border-white/15 px-4 py-1.5 text-sm font-medium text-olive-900 dark:text-paper hover:bg-olive-900/5 dark:hover:bg-white/10"
                >
                  <FiShare2 /> Share
                </button>
                <button
                  onClick={() => showPass(cert._id)}
                  className="flex items-center gap-1.5 rounded-full border border-olive-900/15 dark:border-white/15 px-4 py-1.5 text-sm font-medium text-olive-900 dark:text-paper hover:bg-olive-900/5 dark:hover:bg-white/10"
                >
                  <FiSmartphone /> Offline pass
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {shares.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-semibold text-olive-950 dark:text-paper">Who can see my credentials</h2>
          <div className="mt-3 space-y-2">
            {shares.map((sh) => {
              const live = !sh.revoked && new Date(sh.expiresAt) > new Date();
              return (
                <div key={sh._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-olive-900/10 dark:border-white/10 p-4 text-sm text-olive-950 dark:text-paper">
                  <span>{sh.label || "Unnamed link"} · {sh.certificate?.certificateId} · {sh.views} view(s) · {live ? `expires ${new Date(sh.expiresAt).toLocaleString()}` : sh.revoked ? "revoked" : "expired"}</span>
                  {live && <button onClick={() => revoke(sh._id)} className="rounded-full border border-red-400/50 px-3 py-1 text-red-500">Revoke</button>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(modal || pass) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 text-olive-950 dark:bg-olive-900 dark:text-paper">
            <button onClick={() => { setModal(null); setPass(null); }} className="absolute right-4 top-4"><FiX /></button>
            {pass ? (
              <>
                <h3 className="font-display text-lg font-semibold">Signed offline pass</h3>
                <p className="mt-1 text-sm opacity-70">Signature can be checked at /verify/pass without trusting a server.</p>
                <img src={pass.qr} alt="Offline pass QR" className="mx-auto mt-4 h-52 w-52 rounded bg-white p-2" />
                <button onClick={() => navigator.clipboard.writeText(pass.pass)} className="mt-3 w-full rounded-full border px-4 py-2 text-sm">Copy pass text</button>
              </>
            ) : created ? (
              <>
                <h3 className="font-display text-lg font-semibold">Link ready (copied)</h3>
                <img src={created.qr} alt="Share QR" className="mx-auto mt-4 h-44 w-44" />
                <p className="mt-3 break-all font-mono text-xs opacity-70">{created.url}</p>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-semibold">Share {modal.degree}</h3>
                <p className="mt-1 text-sm opacity-70">You decide what the verifier sees and for how long.</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  {FIELDS.map(([k, l]) => (
                    <label key={k} className="flex items-center gap-2">
                      <input type="checkbox" checked={fields.includes(k)} onChange={() => setFields((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]))} /> {l}
                    </label>
                  ))}
                </div>
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Shared with (e.g. Infosys HR)" className="mt-4 w-full rounded-lg border px-3 py-2 text-sm text-olive-950" />
                <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="mt-3 w-full rounded-lg border px-3 py-2 text-sm text-olive-950">
                  <option value={1}>Expires in 1 hour</option><option value={24}>24 hours</option><option value={168}>7 days</option><option value={720}>30 days</option>
                </select>
                <button onClick={createShare} className="mt-4 w-full rounded-full bg-clay-500 px-4 py-2.5 font-semibold text-olive-950">Create link</button>
              </>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
