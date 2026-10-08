import { motion } from "framer-motion";

/**
 * The recurring visual signature of the platform: a rotating dashed ring
 * standing in for a wax/government stamp, with a checkmark at its center.
 * Used in the hero (large) and next to verification results (small).
 */
export default function VerificationSeal({ size = 220, className = "" }) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <motion.svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx="100"
          cy="100"
          r="92"
          fill="none"
          stroke="#C9843F"
          strokeWidth="2"
          strokeDasharray="4 7"
        />
        <circle
          cx="100"
          cy="100"
          r="78"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.35"
          strokeWidth="1"
        />
      </motion.svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="flex items-center justify-center rounded-full"
          style={{
            width: size * 0.62,
            height: size * 0.62,
            background: "radial-gradient(circle at 35% 30%, #123061, #1C2310)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08) inset, 0 12px 30px rgba(5,13,31,0.5)",
          }}
        >
          <svg width={size * 0.26} height={size * 0.26} viewBox="0 0 24 24" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="#C9843F"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
