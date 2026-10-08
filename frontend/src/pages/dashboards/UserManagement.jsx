import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import DashboardShell from "./DashboardShell";
import TableSkeleton from "../../components/TableSkeleton";
import api from "../../services/api";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/users", { params: { role: role || undefined } });
      setUsers(data.users);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (id) => {
    try {
      await api.patch(`/admin/users/${id}/toggle-active`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update user.");
    }
  };

  return (
    <DashboardShell title="User Management">
      <div className="mb-6 flex gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-full border border-olive-900/15 dark:border-white/15 bg-white dark:bg-olive-900 px-4 py-2 text-sm text-olive-950 dark:text-paper focus:border-clay-500"
        >
          <option value="">All roles</option>
          <option value="super_admin">Super Admin</option>
          <option value="institution">Institution</option>
          <option value="student">Student</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-olive-900/10 dark:border-white/10 text-xs uppercase text-ink-soft dark:text-paper/60">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Institution</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <TableSkeleton rows={6} cols={6} />
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-soft dark:text-paper/60">No users found.</td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="border-b border-olive-900/5 last:border-0">
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-ink-soft dark:text-paper/60">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{u.role.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-ink-soft dark:text-paper/60">{u.institution?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        u.isActive ? "bg-verified-soft text-verified" : "bg-alert-soft text-alert"
                      }`}
                    >
                      {u.isActive ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggle(u._id)}
                      className="rounded-full border border-olive-900/15 dark:border-white/15 px-3 py-1 text-xs font-medium text-olive-900 dark:text-paper hover:bg-olive-900/5 dark:hover:bg-white/10"
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  );
}
