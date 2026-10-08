import { useState } from "react";
import Navbar from "../components/Navbar";
import api from "../services/api";

const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

// Verifies a signed pass in the browser (WebCrypto Ed25519). Only the public key
// is fetched; once cached the signature check needs no network at all.
export default function PassCheck() {
  const [pass, setPass] = useState("");
  const [res, setRes] = useState(null);

  const check = async () => {
    const [tag, p, sig] = pass.trim().split(".");
    if (tag !== "CRD1" || !sig) return setRes({ ok: false, msg: "Not a Credo pass." });
    try {
      let key = localStorage.getItem("bc_pubkey");
      if (!key) {
        key = (await api.get("/verify/public-key")).data.publicKey;
        localStorage.setItem("bc_pubkey", key);
      }
      const pub = await crypto.subtle.importKey("raw", fromB64u(key), { name: "Ed25519" }, false, ["verify"]);
      const ok = await crypto.subtle.verify("Ed25519", pub, fromB64u(sig), new TextEncoder().encode(p));
      const payload = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
      if (!ok) return setRes({ ok: false, msg: "Signature INVALID. This pass is forged or altered." });
      let live = "Offline: signature valid. Revocation status not checked.";
      try {
        const { data } = await api.post("/verify/pass", { pass: pass.trim() });
        live = data.live?.revoked ? "Signature valid, but the certificate was REVOKED." : data.live?.valid ? "Signature valid and live blockchain check passed." : live;
      } catch (_) {}
      setRes({ ok: true, msg: live, payload });
    } catch (e) {
      setRes({ ok: false, msg: "This browser can't verify Ed25519 offline; use the server check instead." });
    }
  };

  return (
    <div className="min-h-screen bg-olive-950">
      <Navbar />
      <div className="mx-auto max-w-xl px-6 py-20 text-paper">
        <h1 className="font-display text-3xl font-semibold">Verify a signed pass</h1>
        <p className="mt-2 text-paper/60">Paste the text from a student's offline pass QR. Works without internet after first load.</p>
        <textarea value={pass} onChange={(e) => setPass(e.target.value)} rows={4} className="mt-6 w-full rounded-xl border border-white/15 bg-white/5 p-4 font-mono text-xs" placeholder="CRD1...." />
        <button onClick={check} className="mt-4 rounded-full bg-clay-500 px-6 py-3 font-semibold text-olive-950">Verify signature</button>
        {res && (
          <div className={`mt-6 rounded-xl border p-5 ${res.ok ? "border-emerald-400/40" : "border-red-400/40"}`}>
            <p className={res.ok ? "text-emerald-400" : "text-red-400"}>{res.msg}</p>
            {res.payload && <p className="mt-2 font-mono text-xs text-paper/60">{res.payload.id} · issuer {res.payload.iss} · {res.payload.iat}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
