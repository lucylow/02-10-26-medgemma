import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SensorCalibrationWizardProps {
  onClose?: () => void;
}

const steps = [
  {
    title: "Attach the wearable",
    body: "Place the band snugly on the child’s ankle or wrist. Make sure skin contact is comfortable and not too tight.",
  },
  {
    title: "Baseline reading",
    body: "Have the child sit or lie quietly for 30 seconds while the device captures a calm baseline.",
  },
  {
    title: "Movement check",
    body: "Ask the child to wiggle toes or fingers for a few seconds to confirm motion artefact handling.",
  },
];

export function SensorCalibrationWizard({
  onClose,
}: SensorCalibrationWizardProps) {
  const [index, setIndex] = useState(0);

  const current = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        className="rounded-3xl border border-sky-100 bg-sky-50/90 p-3 text-xs text-slate-800 shadow-lg shadow-sky-500/25 backdrop-blur-xl dark:border-sky-900/60 dark:bg-sky-950/80 dark:text-slate-50"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
      >
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-200">
          Sensor calibration
        </p>
        <motion.div
          key={current.title}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          transition={{ duration: 0.18 }}
        >
          <p className="text-[11px] font-semibold">{current.title}</p>
          <p className="mt-1 text-[11px] text-slate-700 dark:text-slate-200">
            {current.body}
          </p>
        </motion.div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {steps.map((step, i) => (
              <span
                key={step.title}
                className={`h-1.5 w-4 rounded-full ${
                  i <= index ? "bg-sky-500" : "bg-sky-200 dark:bg-sky-900"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() =>
                isLast ? onClose?.() : setIndex((prev) => Math.min(prev + 1, steps.length - 1))
              }
              className="rounded-full bg-sky-600 px-3 py-1 text-[11px] font-semibold text-slate-50 shadow-sm hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default SensorCalibrationWizard;

