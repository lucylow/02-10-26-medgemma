"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
function fireConfetti() {
  import("canvas-confetti")
    .then((mod) =>
      mod.default({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    )
    .catch(() => {});
}

interface Milestone {
  id: string;
  type: "case" | "referral" | "streak";
  count: number;
}

export function HumanCelebrations() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const caseCountRef = useRef(0);
  const referralCountRef = useRef(0);

  const totalImpact = {
    screenings: 42,
    referrals: 7,
    livesSaved: 7 * 9500,
    chwsTrained: 247,
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const roll = Math.random();
      if (roll < 0.25) {
        caseCountRef.current += 1;
        const id = `case-${Date.now()}`;
        setMilestones((prev) =>
          [...prev.slice(-4), { id, type: "case", count: caseCountRef.current }]
        );
      } else if (roll < 0.45) {
        referralCountRef.current += 1;
        fireConfetti();
        const id = `ref-${Date.now()}`;
        setMilestones((prev) => [
          ...prev.slice(-4),
          { id, type: "referral", count: referralCountRef.current },
        ]);
      } else if (roll < 0.6) {
        const id = `streak-${Date.now()}`;
        setMilestones((prev) => [
          ...prev.slice(-4),
          { id, type: "streak", count: 7 },
        ]);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed bottom-8 right-8 w-80 sm:w-96 space-y-4 z-50 pointer-events-none"
      aria-live="polite"
      aria-label="Impact and celebration notifications"
    >
      <AnimatePresence>
        {milestones.map((milestone) => (
          <motion.div
            key={milestone.id}
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -100, scale: 0.8 }}
            className={`p-6 rounded-3xl shadow-2xl backdrop-blur-xl text-white font-black text-lg sm:text-xl pointer-events-auto cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50 ${
              milestone.type === "case"
                ? "bg-gradient-to-r from-blue-500 to-indigo-500"
                : milestone.type === "referral"
                  ? "bg-gradient-to-r from-red-500 to-orange-500 shadow-red-500/25 ring-4 ring-red-500/30"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500"
            }`}
          >
            {milestone.type === "case" && `✅ Case #${milestone.count}`}
            {milestone.type === "referral" &&
              `🚨 REFERRAL #${milestone.count} SAVED!`}
            {milestone.type === "streak" && `🔥 ${milestone.count} DAY STREAK!`}
          </motion.div>
        ))}
      </AnimatePresence>

      <motion.div
        className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl ring-2 ring-gray-200/50 pointer-events-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        aria-label="Your impact today"
      >
        <h4 className="font-black text-lg text-gray-900 mb-4">
          Your Impact Today
        </h4>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-black text-blue-600">
              {totalImpact.screenings.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Screenings</div>
          </div>
          <div>
            <div className="text-2xl font-black text-red-600">
              {totalImpact.referrals.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Referrals</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-3xl font-black text-emerald-600">
            ${totalImpact.livesSaved.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            Economic Impact
          </div>
        </div>
      </motion.div>
    </div>
  );
}
