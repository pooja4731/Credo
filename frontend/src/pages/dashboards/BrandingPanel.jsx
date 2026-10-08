import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../services/api";

const THEMES = [
  ["Olive & Clay", "#3F4D20", "#C9843F"], ["Sage", "#54652B", "#A85D1A"], ["Moss & Gold", "#2F3A18", "#C9A23F"],
  ["Forest", "#1F5B43", "#D9A441"], ["Charcoal", "#2B2B2B", "#6B7D3A"],
];
const TEMPLATES = [["classic", "Classic", "Coloured header band"], ["modern", "Modern", "Clean, left-aligned"], ["elegant", "Elegant", "Serif, double border"]];
const input = "mt-1 w-full rounded-lg border border-olive-900/15 dark:border-white/15 bg-paper dark:bg-olive-950 px-3 py-2 text-sm text-olive-950 dark:text-paper";

// Each institution designs its own certificate: header name, theme, font, colours, logo, signatory.
export default function BrandingPanel({ institution }) {
  const [b, setB] = useState({ headerName: institution.name, template: "classic", fontFamily: "helvetica", bgColor: "#FFFFFF", headerCase: "", headerSize: "medium", certificateTitle: "", primaryColor: "#3F4D20", accentColor: "#C9843F", ...(institution.branding || {}) });
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setB((o) => ({ ...o, [k]: v }));

  const render = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/institution/branding/preview", { branding: b }, { responseType: "blob" });
      setPreview((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(data); });
    } catch { toast.error("Preview failed."); }
    setBusy(false);
  };
  useEffect(() => { render(); }, []); // eslint-disable-line

  const save = async () => {
    try { await api.patch("/institution/profile", { branding: b }); toast.success("Certificate design saved. New certificates will use it."); }
    catch (e) { toast.error(e.response?.data?.message || "Save failed."); }
  };
  const onLogo = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g)$/.test(f.type) || f.size > 400000) return toast.error("Use a PNG/JPG under 400 KB.");
    const r = new FileReader();
    r.onload = () => set("logoDataUrl", r.result);
    r.readAsDataURL(f);
  };

  return (
    <div className="mt-6 rounded-xl border border-olive-900/10 dark:border-white/10 bg-white dark:bg-olive-900 p-6">
      <h3 className="font-display text-lg font-semibold text-olive-950 dark:text-paper">Certificate Design</h3>
      <p className="text-sm text-ink-soft dark:text-paper/60">Your name, colours and style appear on every certificate you issue.</p>
      <div className="mt-5 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 text-olive-950 dark:text-paper">
          <label className="block text-xs font-medium">Header name<input className={input} value={b.headerName || ""} maxLength={60} onChange={(e) => set("headerName", e.target.value)} /></label>
          <label className="block text-xs font-medium">Tagline<input className={input} value={b.tagline || ""} maxLength={80} onChange={(e) => set("tagline", e.target.value)} placeholder="Learn. Build. Ship." /></label>
          <label className="block text-xs font-medium">Certificate title<input className={input} value={b.certificateTitle || ""} maxLength={60} onChange={(e) => set("certificateTitle", e.target.value)} placeholder="Certificate of Completion" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium">Header text style
              <select className={input} value={b.headerCase || ""} onChange={(e) => set("headerCase", e.target.value)}>
                <option value="">Template default</option><option value="upper">UPPERCASE</option><option value="title">Title Case</option><option value="asis">As typed</option>
              </select>
            </label>
            <label className="block text-xs font-medium">Header size
              <select className={input} value={b.headerSize || "medium"} onChange={(e) => set("headerSize", e.target.value)}>
                <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option>
              </select>
            </label>
          </div>
          <div>
            <p className="text-xs font-medium">Template</p>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {TEMPLATES.map(([k, n, d]) => (
                <button key={k} type="button" onClick={() => set("template", k)} className={`rounded-lg border p-2 text-left text-xs ${b.template === k ? "border-clay-500 bg-clay-500/10" : "border-olive-900/15 dark:border-white/15"}`}>
                  <b>{n}</b><br />{d}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-xs font-medium">Font
            <select className={input} value={b.fontFamily} onChange={(e) => set("fontFamily", e.target.value)}>
              <option value="helvetica">Helvetica (clean sans)</option><option value="montserrat">Montserrat (modern sans)</option><option value="times">Times (classic serif)</option><option value="playfair">Playfair Display (elegant serif)</option><option value="lora">Lora (friendly serif)</option><option value="courier">Courier (typewriter)</option>
            </select>
          </label>
          <div>
            <p className="text-xs font-medium">Quick themes</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {THEMES.map(([n, p, a]) => (
                <button key={n} type="button" title={n} onClick={() => setB((o) => ({ ...o, primaryColor: p, accentColor: a }))} className="flex h-8 w-14 overflow-hidden rounded-full border border-white/30">
                  <span className="flex-1" style={{ background: p }} /><span className="flex-1" style={{ background: a }} />
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[["primaryColor", "Primary"], ["accentColor", "Accent"], ["bgColor", "Background"]].map(([k, l]) => (
              <label key={k} className="block text-xs font-medium">{l}
                <div className="mt-1 flex items-center gap-2"><input type="color" value={b[k]} onChange={(e) => set(k, e.target.value)} className="h-9 w-12 rounded" /><span className="font-mono text-xs">{b[k]}</span></div>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium">Signatory name<input className={input} value={b.signatoryName || ""} onChange={(e) => set("signatoryName", e.target.value)} /></label>
            <label className="block text-xs font-medium">Signatory title<input className={input} value={b.signatoryTitle || ""} onChange={(e) => set("signatoryTitle", e.target.value)} placeholder="Director" /></label>
          </div>
          <label className="block text-xs font-medium">Footer text<input className={input} value={b.footerText || ""} maxLength={120} onChange={(e) => set("footerText", e.target.value)} placeholder="www.yourcompany.com" /></label>
          <label className="block text-xs font-medium">Logo (PNG/JPG, under 400 KB)<input type="file" accept="image/png,image/jpeg" onChange={onLogo} className="mt-1 block text-xs" /></label>
          <div className="flex gap-3">
            <button type="button" onClick={render} disabled={busy} className="rounded-full border border-olive-900/20 dark:border-white/20 px-5 py-2 text-sm font-medium">{busy ? "Rendering…" : "Update preview"}</button>
            <button type="button" onClick={save} className="rounded-full bg-clay-500 px-5 py-2 text-sm font-semibold text-olive-950">Save design</button>
          </div>
        </div>
        <div>{preview ? <iframe title="Certificate preview" src={`${preview}#toolbar=0&navpanes=0`} className="h-[380px] w-full rounded-lg border border-olive-900/10 dark:border-white/10 bg-white" /> : <p className="text-sm text-ink-soft">Rendering preview…</p>}</div>
      </div>
    </div>
  );
}
