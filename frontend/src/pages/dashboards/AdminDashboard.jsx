import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { FiActivity, FiUsers } from "react-icons/fi";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import api from "../../services/api";
import DashboardShell from "./DashboardShell";
import CardSkeleton from "../../components/CardSkeleton";

export default function AdminDashboard() {
  const [institutions, setInstitutions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [instRes, analyticsRes] = await Promise.all([
        api.get("/admin/institutions", { params: { status: "pending" } }),
        api.get("/admin/analytics"),
      ]);
      setInstitutions(instRes.data.institutions);
      setAnalytics(analyticsRes.data.analytics);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id) => {
    try {
      await api.patch(`/admin/institutions/${id}/approve`);
      toast.success("Institution approved.");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Approval failed.");
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt("Reason for rejection:");
    if (reason === null) return;
    try {
      await api.patch(`/admin/institutions/${id}/reject`, { reason });
      toast.success("Institution rejected.");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Rejection failed.");
    }
  };

  return (
    <DashboardShell title="Super Admin Dashboard">
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          to="/admin/transactions"
          className="flex items-center gap-2 rounded-full bg-olive-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-olive-800"
        >
          <FiActivity /> Blockchain Explorer
        </Link>
        <Link
          to="/admin/users"
          className="flex items-center gap-2 rounded-full border border-olive-900/15 dark:border-white/15 px-5 py-2.5 text-sm font-medium text-olive-900 dark:text-paper hover:bg-olive-900/5 dark:hover:bg-white/10"
        >
          <FiUsers /> Manage Users
        </Link>
      </div>

      {loading || !analytics ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Certificates Issued" value={analytics.certificates.total} />
          <StatCard label="Active Institutions" value={analytics.institutions.approved} />
          <StatCard label="Pending Approvals" value={analytics.institutions.pending} />
          <StatCard label="Blockchain Tx Success" value={`${analytics.blockchain.successRate}%`} />
        </div>
      )}

      {analytics && (
        <div className="mb-10 rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900 p-6">
          <h2 className="font-display text-lg font-semibold text-olive-950 dark:text-paper">
            Certificates Issued — Last 14 Days
          </h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.timeSeries} margin={{ left: -20, right: 10 }}>
                <defs>
                  <linearGradient id="issuedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C9843F" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#C9843F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3F4D2012" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#4A5568" }}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis tick={{ fontSize: 11, fill: "#4A5568" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: "1px solid #3F4D2020", fontSize: 12 }}
                  labelFormatter={(d) => new Date(d).toLocaleDateString()}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#C9843F"
                  strokeWidth={2}
                  fill="url(#issuedGradient)"
                  name="Certificates issued"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <h2 className="font-display text-lg font-semibold text-olive-950 dark:text-paper">Pending Institution Approvals</h2>
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-sm text-ink-soft dark:text-paper/60">Loading…</p>
        ) : institutions.length === 0 ? (
          <p className="text-sm text-ink-soft dark:text-paper/60">No pending institutions right now.</p>
        ) : (
          institutions.map((inst) => (
            <div
              key={inst._id}
              className="flex items-center justify-between rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900 p-5"
            >
              <div>
                <p className="font-medium text-olive-950 dark:text-paper">{inst.name}</p>
                <p className="text-xs text-ink-soft dark:text-paper/60">{inst.email} · {inst.code}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(inst._id)}
                  className="rounded-full bg-verified px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReject(inst._id)}
                  className="rounded-full bg-alert px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </DashboardShell>
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
