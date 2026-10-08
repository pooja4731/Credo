import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

export default function RegisterInstitution() {
  const { registerInstitution } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    try {
      const data = await registerInstitution(values);
      toast.success(data.message || "Registration submitted for review.");
      navigate("/institution/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-olive-950 px-6 py-16">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-xl">
        <Link to="/" className="font-display text-xl font-semibold text-paper">
          Cred<span className="text-clay-500">o</span>
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold text-paper">Institution registration</h1>
        <p className="mt-2 text-sm text-paper/60">
          Your account will be reviewed by a Super Admin before you can issue certificates.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact name" error={errors.name}>
              <input {...register("name", { required: "Required" })} className={inputClass} />
            </Field>
            <Field label="Email" error={errors.email}>
              <input type="email" {...register("email", { required: "Required" })} className={inputClass} />
            </Field>
          </div>

          <Field label="Password" error={errors.password}>
            <input
              type="password"
              {...register("password", { required: "Required", minLength: { value: 8, message: "At least 8 characters" } })}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Institution name" error={errors.institutionName}>
              <input {...register("institutionName", { required: "Required" })} className={inputClass} />
            </Field>
            <Field label="Institution code" error={errors.institutionCode}>
              <input {...register("institutionCode", { required: "Required" })} className={inputClass} placeholder="e.g. MIT01" />
            </Field>
          </div>

          <Field label="Phone">
            <input {...register("phone")} className={inputClass} />
          </Field>
          <Field label="Address">
            <input {...register("address")} className={inputClass} />
          </Field>
          <Field label="Wallet address (optional — can be added later)" error={errors.walletAddress}>
            <input {...register("walletAddress")} className={`${inputClass} font-mono text-sm`} placeholder="0x..." />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-clay-500 py-3 font-semibold text-olive-950 transition hover:bg-clay-400 disabled:opacity-60"
          >
            {isSubmitting ? "Submitting…" : "Submit for approval"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-paper/60">
          Already registered? <Link to="/login?role=institution" className="font-medium text-clay-400">Log in</Link>
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
