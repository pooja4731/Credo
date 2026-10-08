import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import api from "../../services/api";
import DashboardShell from "./DashboardShell";
import BrandingPanel from "./BrandingPanel";

export default function InstitutionProfile() {
  const [institution, setInstitution] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm();

  useEffect(() => {
    api
      .get("/institution/profile")
      .then(({ data }) => {
        setInstitution(data.institution);
        reset({
          phone: data.institution.phone || "",
          address: data.institution.address || "",
          website: data.institution.website || "",
          walletAddress: data.institution.walletAddress || "",
        });
      })
      .catch((err) => toast.error(err.response?.data?.message || "Failed to load profile."));
  }, [reset]);

  const onSubmit = async (values) => {
    try {
      const { data } = await api.patch("/institution/profile", values);
      setInstitution(data.institution);
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed.");
    }
  };

  if (!institution) {
    return (
      <DashboardShell title="Institution Profile">
        <p className="text-ink-soft dark:text-paper/60">Loading…</p>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell title="Institution Profile">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900 p-6 lg:col-span-1">
          <h2 className="font-display text-lg font-semibold text-olive-950 dark:text-paper">{institution.name}</h2>
          <p className="mt-1 font-mono text-sm text-ink-soft dark:text-paper/60">{institution.code}</p>
          <div className="mt-4">
            <StatusBadge status={institution.status} />
          </div>
          <dl className="mt-6 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase text-ink-soft dark:text-paper/60/70">Certificates Issued</dt>
              <dd className="font-mono text-olive-950 dark:text-paper">{institution.stats?.certificatesIssued ?? 0}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-ink-soft dark:text-paper/60/70">Registered Email</dt>
              <dd className="text-olive-950 dark:text-paper">{institution.email}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900 p-6 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold text-olive-950 dark:text-paper">Editable Details</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <Field label="Phone">
              <input {...register("phone")} className={inputClass} />
            </Field>
            <Field label="Address">
              <input {...register("address")} className={inputClass} />
            </Field>
            <Field label="Website">
              <input {...register("website")} className={inputClass} placeholder="https://" />
            </Field>
            <Field label="Wallet address" error={errors.walletAddress}>
              <input
                {...register("walletAddress", {
                  pattern: {
                    value: /^0x[a-fA-F0-9]{40}$/,
                    message: "Must be a valid Ethereum address (or leave blank)",
                  },
                })}
                className={`${inputClass} font-mono text-sm`}
                placeholder="0x..."
              />
              <p className="mt-1 text-xs text-ink-soft dark:text-paper/60">
                This wallet is granted on-chain issuer rights when your institution is approved. Changing it
                after approval requires a Super Admin to re-run approval on the new address.
              </p>
            </Field>

            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="rounded-full bg-clay-500 px-6 py-2.5 font-semibold text-olive-950 dark:text-paper transition hover:bg-clay-400 disabled:opacity-50"
            >
              {isSubmitting ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
      <BrandingPanel institution={institution} />
    </DashboardShell>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-olive-900/15 dark:border-white/15 bg-paper dark:bg-olive-950 px-4 py-2.5 text-olive-950 dark:text-paper focus:border-clay-500";

function Field({ label, error, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-ink-soft dark:text-paper/60">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-alert">{error.message}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const cls =
    status === "approved"
      ? "bg-verified-soft text-verified"
      : status === "pending"
      ? "bg-clay-300/30 text-clay-600"
      : "bg-alert-soft text-alert";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${cls}`}>{status}</span>;
}
