import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { roleHome } from "../components/ProtectedRoute";

const ROLE_TABS = [
  { key: "student", label: "Student" },
  { key: "institution", label: "Institution" },
  { key: "super_admin", label: "Admin" },
];

export default function Login() {
  const [params] = useSearchParams();
  const [activeTab, setActiveTab] = useState(params.get("role") || "student");
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}.`);
      navigate(roleHome(user.role));
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed. Check your credentials.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-olive-950 px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl"
      >
        <Link to="/" className="font-display text-xl font-semibold text-paper">
          Cred<span className="text-clay-500">o</span>
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-paper">Log in</h1>

        <div className="mt-6 flex rounded-full bg-white/5 p-1">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-clay-500 text-olive-950"
                  : "text-paper/60 hover:text-paper"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-paper/70">Email</label>
            <input
              type="email"
              {...register("email", { required: "Email is required" })}
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-paper placeholder:text-paper/30 focus:border-clay-500"
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-alert">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-xs font-medium text-paper/70">Password</label>
            <input
              type="password"
              {...register("password", { required: "Password is required" })}
              className="mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-paper placeholder:text-paper/30 focus:border-clay-500"
              placeholder="••••••••"
            />
            {errors.password && <p className="mt-1 text-xs text-alert">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-clay-500 py-3 font-semibold text-olive-950 transition hover:bg-clay-400 disabled:opacity-60"
          >
            {isSubmitting ? "Logging in…" : `Log in as ${ROLE_TABS.find((t) => t.key === activeTab).label}`}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-paper/60">
          {activeTab === "student" && (
            <>No account? <Link to="/register/student" className="font-medium text-clay-400">Register as a student</Link></>
          )}
          {activeTab === "institution" && (
            <>No account? <Link to="/register/institution" className="font-medium text-clay-400">Register your institution</Link></>
          )}
          {activeTab === "super_admin" && "Admin accounts are provisioned by the platform team."}
        </p>

        <Link to="/verify" className="mt-4 block text-center text-sm font-medium text-paper/50 hover:text-clay-400">
          Just verifying a certificate? Use Public Verify →
        </Link>
      </motion.div>
    </div>
  );
}
