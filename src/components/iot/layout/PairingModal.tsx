import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bluetooth, Radio, ScanLine } from "lucide-react";

export function PairingModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open device pairing flow"
        className="fixed bottom-5 left-1/2 z-30 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 via-teal-400 to-emerald-400 px-5 text-xs font-semibold text-white shadow-xl shadow-sky-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 dark:shadow-emerald-900/40"
        onClick={() => setOpen(true)}
      >
        <Bluetooth className="h-4 w-4" aria-hidden="true" />
        Pair wearable or camera
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 px-3 pb-4 pt-12 backdrop-blur-sm sm:items-center sm:px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            aria-modal="true"
            role="dialog"
            aria-labelledby="pairing-title"
          >
            <motion.div
              className="w-full max-w-md rounded-3xl bg-white/95 p-4 shadow-2xl shadow-sky-900/20 ring-1 ring-slate-200 backdrop-blur dark:bg-slate-950/95 dark:ring-slate-700"
              initial={{ y: 40, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2
                    id="pairing-title"
                    className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50"
                  >
                    Pair a pediatric device
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Use BLE or NFC to securely link a wearable, nursery camera, or
                    Pi5 edge hub. No PHI leaves the device during pairing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 bg-white/80 px-2 py-1 text-[11px] text-slate-500 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:bg-slate-900"
                >
                  Esc
                </button>
              </div>

              <ol className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                <li className="flex gap-2 rounded-2xl bg-sky-50/80 p-2.5 dark:bg-sky-900/30">
                  <span className="mt-0.5 h-5 w-5 flex-none rounded-full bg-sky-500 text-center text-[11px] font-semibold text-white">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-50">
                      Wake the device
                    </p>
                    <p>
                      Ensure the wearable, camera, or Pi5 hub is powered on and within
                      2 meters of this tablet or phone.
                    </p>
                  </div>
                </li>
                <li className="flex gap-2 rounded-2xl bg-emerald-50/80 p-2.5 dark:bg-emerald-900/20">
                  <span className="mt-0.5 h-5 w-5 flex-none rounded-full bg-emerald-500 text-center text-[11px] font-semibold text-white">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-50">
                      Scan via BLE or NFC
                    </p>
                    <p>
                      Tap the device to the back of this screen for NFC, or keep it
                      nearby to auto-detect via Bluetooth Low Energy.
                    </p>
                  </div>
                </li>
                <li className="flex gap-2 rounded-2xl bg-slate-50/80 p-2.5 dark:bg-slate-900/60">
                  <span className="mt-0.5 h-5 w-5 flex-none rounded-full bg-slate-500 text-center text-[11px] font-semibold text-white">
                    3
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-50">
                      Confirm child and room
                    </p>
                    <p>
                      Choose the child profile and room location. PediScreen will link
                      vitals and video streams to this dashboard only.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Radio className="h-3.5 w-3.5 text-sky-500" aria-hidden="true" />
                  <span>Scanning in demo mode (mock devices only).</span>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-50 shadow-sm hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />
                  Start scan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default PairingModal;

