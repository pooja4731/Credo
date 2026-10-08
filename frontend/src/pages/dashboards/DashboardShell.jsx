import { Link } from "react-router-dom";
import { FiSun, FiMoon } from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

/**
 * Shared shell for all role dashboards: header with branding, theme
 * toggle, user info, and logout, plus a consistent content container.
 */
export default function DashboardShell({ title, children }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-paper-dim dark:bg-olive-950">
      <header className="flex items-center justify-between border-b border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900 px-6 py-4">
        <Link to="/" className="font-display text-lg font-semibold text-olive-950 dark:text-paper">
          Cred<span className="text-clay-600 dark:text-clay-400">o</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="rounded-full border border-olive-900/15 dark:border-white/15 p-2 text-olive-900 dark:text-paper transition hover:bg-olive-900/5 dark:hover:bg-white/10"
          >
            {theme === "dark" ? <FiSun /> : <FiMoon />}
          </button>
          <span className="text-ink-soft dark:text-paper/60">
            {user?.name} <span className="text-ink-soft/50 dark:text-paper/40">· {formatRole(user?.role)}</span>
          </span>
          <button
            onClick={logout}
            className="rounded-full border border-olive-900/15 dark:border-white/15 px-4 py-1.5 font-medium text-olive-900 dark:text-paper transition hover:bg-olive-900/5 dark:hover:bg-white/10"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="font-display text-2xl font-semibold text-olive-950 dark:text-paper">{title}</h1>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

function formatRole(role) {
  if (!role) return "";
  return role
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
