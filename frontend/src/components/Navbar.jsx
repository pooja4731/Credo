import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "./ProtectedRoute";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-olive-950/85 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-xl font-semibold tracking-tight text-paper">
            Cred<span className="text-clay-500">o</span>
          </span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-sm font-medium text-paper/75 transition hover:text-clay-400"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <button
                onClick={() => navigate(roleHome(user.role))}
                className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-paper transition hover:bg-white/20"
              >
                Dashboard
              </button>
              <button
                onClick={logout}
                className="rounded-full px-4 py-2 text-sm font-medium text-paper/70 transition hover:text-clay-400"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/verify"
                className="rounded-full px-4 py-2 text-sm font-medium text-paper/85 transition hover:text-clay-400"
              >
                Public Verify
              </Link>
              <Link
                to="/login"
                className="rounded-full bg-clay-500 px-5 py-2 text-sm font-semibold text-olive-950 transition hover:bg-clay-400"
              >
                Log in
              </Link>
            </>
          )}
        </div>

        <button
          className="text-paper md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-olive-950 px-6 py-4 md:hidden">
          <ul className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-paper/80"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li className="flex flex-col gap-3 pt-2">
              <Link to="/verify" className="text-sm font-medium text-paper/80">
                Public Verify
              </Link>
              {user ? (
                <button
                  onClick={() => navigate(roleHome(user.role))}
                  className="rounded-full bg-clay-500 px-5 py-2 text-sm font-semibold text-olive-950"
                >
                  Dashboard
                </button>
              ) : (
                <Link
                  to="/login"
                  className="rounded-full bg-clay-500 px-5 py-2 text-center text-sm font-semibold text-olive-950"
                >
                  Log in
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
