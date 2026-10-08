import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { FiChevronLeft, FiChevronRight, FiCheckCircle, FiXCircle, FiClock } from "react-icons/fi";
import api from "../../services/api";
import DashboardShell from "./DashboardShell";
import TableSkeleton from "../../components/TableSkeleton";

const PAGE_SIZE = 15;

export default function BlockchainExplorer() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/transactions", {
        params: { page, limit: PAGE_SIZE, type: type || undefined, status: status || undefined },
      });
      setTransactions(data.transactions);
      setPagination(data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [type, status]);

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <DashboardShell title="Blockchain Explorer">
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-full border border-olive-900/15 dark:border-white/15 bg-white dark:bg-olive-900 px-4 py-2 text-sm text-olive-950 dark:text-paper focus:border-clay-500"
        >
          <option value="">All types</option>
          <option value="issue">Issue</option>
          <option value="revoke">Revoke</option>
          <option value="verify">Verify</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-full border border-olive-900/15 dark:border-white/15 bg-white dark:bg-olive-900 px-4 py-2 text-sm text-olive-950 dark:text-paper focus:border-clay-500"
        >
          <option value="">All statuses</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-olive-900/10 dark:border-white/10 text-xs uppercase text-ink-soft dark:text-paper/60">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Certificate</th>
              <th className="px-4 py-3">Tx Hash</th>
              <th className="px-4 py-3">Block</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={8} cols={6} />
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-soft dark:text-paper/60">
                  No transactions recorded yet.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx._id} className="border-b border-olive-900/5 last:border-0">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-olive-900/5 px-2.5 py-0.5 text-xs font-medium capitalize text-olive-900 dark:text-paper">
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {tx.certificate?.certificateId || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {tx.transactionHash ? `${tx.transactionHash.slice(0, 10)}…${tx.transactionHash.slice(-6)}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{tx.blockNumber ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={tx.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft dark:text-paper/60">
                    {new Date(tx.createdAt).toLocaleString()}
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
            Page {pagination.page} of {pagination.pages} · {pagination.total} transactions
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

function StatusBadge({ status }) {
  const map = {
    confirmed: { icon: FiCheckCircle, cls: "bg-verified-soft text-verified" },
    pending: { icon: FiClock, cls: "bg-clay-300/30 text-clay-600" },
    failed: { icon: FiXCircle, cls: "bg-alert-soft text-alert" },
  };
  const { icon: Icon, cls } = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      <Icon /> {status}
    </span>
  );
}
