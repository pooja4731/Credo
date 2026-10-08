import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../components/ProtectedRoute";

// Front page: deep olive hero, warm paper sections, clay accents.
// Texture is pure CSS (dot grid, soft glows, fine lines) - no images, no animation.
// Only existing tokens used: olive-700/800/900, clay-500/600, paper, paper-dim, ink, ink-soft.

const DOTS = {
  backgroundImage: "radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
};
const GLOWS = {
  backgroundImage:
    "radial-gradient(600px circle at 85% 10%, rgba(196,120,80,0.28), transparent 60%), radial-gradient(500px circle at 5% 100%, rgba(255,255,255,0.08), transparent 60%)",
};
const LINES = {
  backgroundImage:
    "repeating-linear-gradient(135deg, rgba(60,70,30,0.05) 0, rgba(60,70,30,0.05) 1px, transparent 1px, transparent 14px)",
};

const STEPS = [
  ["1", "College issues it", "The institution fills in the details. Credo makes the PDF and saves a fingerprint of it on the blockchain."],
  ["2", "Student keeps it", "The student gets the certificate in their own account and chooses what to show, and for how long."],
  ["3", "Anyone can check it", "An employer scans the QR code or types the certificate ID. They see right away if it is genuine, changed or revoked."],
];

const AUDIENCE = [
  ["Colleges and training centres", "Issue one certificate or a whole batch. Put your own name, colours and font on every certificate.", "/register/institution", "Register your institution"],
  ["Students", "Keep every certificate in one place. Share only the details you want, and cancel a link whenever you like.", "/register/student", "Create a student account"],
  ["Employers", "No account needed. Scan the QR code or enter the ID to see whether a certificate is real.", "/verify", "Verify a certificate"],
];

const FAQ = [
  ["What happens if someone edits a certificate?", "Credo compares it with the fingerprint saved when it was issued. Even a small change makes the check fail."],
  ["Can a college cancel a certificate?", "Yes. If one was issued by mistake, the college can revoke it, and the check will then show it as revoked."],
  ["What goes on the blockchain?", "Only a fingerprint of the certificate and its status (valid or revoked). Names and marks are not written to the blockchain."],
  ["Does it prove a college is recognised?", "Not by itself. Credo shows that a certificate came from a registered institution and has not been changed. Whether that institution is accredited is a separate check."],
];

export default function Landing() {
  const { user, logout } = useAuth();
  const link = "text-sm text-white/80 hover:text-white";

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Hero with nav */}
      <div className="relative overflow-hidden bg-olive-900 text-white">
        <div className="pointer-events-none absolute inset-0" style={GLOWS} />
        <div className="pointer-events-none absolute inset-0" style={DOTS} />

        <header className="relative border-b border-white/10">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
            <Link to="/" className="font-display text-2xl font-semibold text-white">
              Cred<span className="text-clay-500">o</span>
            </Link>
            <div className="flex items-center gap-6">
              <a href="#how" className={`${link} hidden sm:block`}>How it works</a>
              <a href="#who" className={`${link} hidden sm:block`}>Who it is for</a>
              <a href="#faq" className={`${link} hidden sm:block`}>Questions</a>
              {user ? (
                <>
                  <Link to={roleHome(user.role)} className="rounded-md bg-clay-500 px-4 py-2 text-sm font-medium text-white hover:bg-clay-600">Dashboard</Link>
                  <button onClick={logout} className={link}>Log out</button>
                </>
              ) : (
                <Link to="/login" className="rounded-md border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white hover:text-olive-900">Log in</Link>
              )}
            </div>
          </nav>
        </header>

        <section className="relative mx-auto max-w-5xl px-6 pb-24 pt-20 sm:pt-28">
          <p className="inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-white/90">
            Certificate verification
          </p>
          <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            A certificate you can check in <span className="text-clay-500">seconds.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/75">
            Colleges issue certificates on Credo. Anyone can then confirm that a certificate is genuine,
            has not been altered, and has not been cancelled.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/verify" className="rounded-md bg-clay-500 px-6 py-3 font-medium text-white shadow-lg shadow-black/20 hover:bg-clay-600">Verify a certificate</Link>
            <Link to="/register/institution" className="rounded-md border border-white/40 px-6 py-3 font-medium text-white hover:bg-white/10">Issue certificates</Link>
          </div>
        </section>
      </div>

      <main>
        {/* How it works */}
        <section id="how" className="relative" style={LINES}>
          <div className="mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-2xl font-semibold text-olive-900">How it works</h2>
            <div className="mt-2 h-1 w-12 rounded bg-clay-500" />
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {STEPS.map(([n, title, text]) => (
                <div key={n} className="rounded-xl border border-olive-900/10 bg-white p-6 shadow-sm">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-olive-800 text-sm font-semibold text-white ring-4 ring-olive-800/10">{n}</span>
                  <h3 className="mt-4 text-lg font-semibold text-olive-900">{title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-soft">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it is for */}
        <section id="who" className="relative bg-olive-800 text-white">
          <div className="pointer-events-none absolute inset-0" style={DOTS} />
          <div className="relative mx-auto max-w-5xl px-6 py-16">
            <h2 className="text-2xl font-semibold">Who it is for</h2>
            <div className="mt-2 h-1 w-12 rounded bg-clay-500" />
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {AUDIENCE.map(([title, text, to, cta]) => (
                <div key={title} className="flex flex-col rounded-xl border-t-4 border-clay-500 bg-white p-6 text-ink shadow-lg shadow-black/10">
                  <h3 className="text-lg font-semibold text-olive-900">{title}</h3>
                  <p className="mt-2 flex-1 leading-relaxed text-ink-soft">{text}</p>
                  <Link to={to} className="mt-5 text-sm font-medium text-olive-700 hover:text-clay-600">{cta} →</Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="relative" style={LINES}>
          <div className="mx-auto max-w-3xl px-6 py-16">
            <h2 className="text-2xl font-semibold text-olive-900">Questions</h2>
            <div className="mt-2 h-1 w-12 rounded bg-clay-500" />
            <div className="mt-6 space-y-3">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group rounded-lg border border-olive-900/10 bg-white px-5 py-4 shadow-sm open:border-clay-500/50">
                  <summary className="cursor-pointer list-none font-medium text-olive-900">{q}</summary>
                  <p className="mt-2 leading-relaxed text-ink-soft">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-olive-900 text-white/70">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-sm">
          <span>&copy; {new Date().getFullYear()} Credo</span>
          <span className="flex gap-5">
            <Link to="/verify" className="hover:text-white">Verify</Link>
            <Link to="/verify/pass" className="hover:text-white">Check a signed pass</Link>
            <Link to="/login" className="hover:text-white">Log in</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
