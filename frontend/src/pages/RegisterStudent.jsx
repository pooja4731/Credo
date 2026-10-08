import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

export default function RegisterStudent() {
  const { registerStudent } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      await registerStudent(values);
      toast.success("Account created.");
      navigate("/student/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-olive-950 px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
        <Link to="/" className="font-display text-xl font-semibold text-paper">
          Cred<span className="text-clay-500">o</span>
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-paper">Student registration</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <Field label="Full name" error={errors.name}>
            <input {...register("name", { required: "Name is required" })} className={inputClass} />
          </Field>
          <Field label="Email" error={errors.email}>
            <input type="email" {...register("email", { required: "Email is required" })} className={inputClass} />
          </Field>
          <Field label="Password" error={errors.password}>
            <input
              type="password"
              {...register("password", { required: "Password is required", minLength: { value: 8, message: "At least 8 characters" } })}
              className={inputClass}
            />
          </Field>
          <Field label="Roll number" error={errors.rollNumber}>
            <input {...register("rollNumber", { required: "Roll number is required" })} className={inputClass} />
          </Field>
          <Field label="Department" error={errors.department}>
            <input {...register("department", { required: "Department is required" })} className={inputClass} />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-clay-500 py-3 font-semibold text-olive-950 transition hover:bg-clay-400 disabled:opacity-60"
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-paper/60">
          Already have an account? <Link to="/login" className="font-medium text-clay-400">Log in</Link>
        </p>
      </div>
    </div>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-paper placeholder:text-paper/30 focus:border-clay-500";

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-paper/70">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-alert">{error.message}</p>}
    </div>
  );
}
