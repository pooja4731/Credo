import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { FiSearch, FiChevronLeft, FiChevronRight, FiExternalLink } from "react-icons/fi";
import { Link } from "react-router-dom";
import api from "../../services/api";
import DashboardShell from "./DashboardShell";

const PAGE_SIZE = 10;

export default function IssueHistory() {
  const [certificates, setCertificates] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get("/institution/certificates", {
        params: { page, limit: PAGE_SIZE, search: search || undefined, status: status || undefined },
      });
      setCertificates(data.certificates);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load issue history.");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    load(1);
  }, [load]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load(1);
  };

  return (
    <DashboardShell title="Issue History">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          to="/institution/bulk-upload"
          className="rounded-full bg-clay-500 px-5 py-2 text-sm font-semibold text-olive-950 dark:text-paper hover:bg-clay-400"
        >
          + Bulk Upload
        </Link>

        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft dark:text-paper/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, roll number, or certificate ID"
              className="w-full rounded-full border border-olive-900/15 dark:border-white/15 bg-white dark:bg-olive-900 py-2 pl-9 pr-4 text-sm text-olive-950 dark:text-paper focus:border-clay-500"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
            }}
            className="rounded-full border border-olive-900/15 dark:border-white/15 bg-white dark:bg-olive-900 px-4 py-2 text-sm text-olive-950 dark:text-paper focus:border-clay-500"
          >
            <option value="">All statuses</option>
            <option value="issued">Issued</option>
            <option value="revoked">Revoked</option>
          </select>
          <button
            type="submit"
            className="rounded-full border border-olive-900/15 dark:border-white/15 px-5 py-2 text-sm font-medium text-olive-900 dark:text-paper hover:bg-olive-900/5 dark:hover:bg-white/10"
          >
            Search
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-olive-900/10 dark:border-white/10 text-xs uppercase text-ink-soft dark:text-paper/60">
            <tr>
              <th className="px-4 py-3">Certificate ID</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Roll No.</th>
              <th className="px-4 py-3">Degree</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-soft dark:text-paper/60">Loading…</td>
              </tr>
            ) : certificates.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-soft dark:text-paper/60">No certificates found.</td>
              </tr>
            ) : (
              certificates.map((cert) => (
                <tr key={cert._id} className="border-b border-olive-900/5 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{cert.certificateId}</td>
                  <td className="px-4 py-3">{cert.studentName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{cert.rollNumber}</td>
                  <td className="px-4 py-3">{cert.degree}</td>
                  <td className="px-4 py-3">{new Date(cert.issueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        cert.status === "issued"
                          ? "bg-verified-soft text-verified"
                          : "bg-alert-soft text-alert"
                      }`}
                    >
                      {cert.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={cert.ipfsPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-olive-900 dark:text-paper hover:text-clay-600"
                    >
                      View PDF <FiExternalLink />
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.pages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-soft dark:text-paper/60">
          <span>
            Page {pagination.page} of {pagination.pages} · {pagination.total} certificates
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => load(pagination.page - 1)}
              className="flex items-center gap-1 rounded-full border border-olive-900/15 dark:border-white/15 px-3 py-1.5 disabled:opacity-40"
            >
              <FiChevronLeft /> Prev
            </button>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => load(pagination.page + 1)}
              className="flex items-center gap-1 rounded-full border border-olive-900/15 dark:border-white/15 px-3 py-1.5 disabled:opacity-40"
            >
              Next <FiChevronRight />
            </button>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
