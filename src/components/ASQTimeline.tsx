"use client";

import { motion } from "framer-motion";
import { ASQ3_MILESTONES } from "@/lib/images";

/** Key ages (months) and domain key for timeline — subset of ASQ-3 milestones */
const MILESTONES: { age: number; domain: string; icon: string }[] = [
  { age: 2, domain: "communication_2mo", icon: "👶" },
  { age: 4, domain: "motor_4mo", icon: "🖐️" },
  { age: 6, domain: "communication_6mo", icon: "🚶" },
  { age: 8, domain: "motor_8mo", icon: "🧩" },
  { age: 12, domain: "communication_12mo", icon: "🗣️" },
  { age: 18, domain: "motor_18mo", icon: "🏃" },
  { age: 24, domain: "communication_24mo", icon: "📚" },
  { age: 36, domain: "motor_36mo", icon: "✏️" },
  { age: 48, domain: "communication_48mo", icon: "🎭" },
  { age: 60, domain: "motor_60mo", icon: "✅" },
];

export function ASQTimeline() {
  return (
    <div className="relative max-w-6xl mx-auto px-4 sm:px-8 lg:px-12 py-16 lg:py-24">
      <h2 className="text-3xl sm:text-4xl font-black text-center text-gray-900 dark:text-gray-100 mb-4">
        ASQ-3 Milestone Journey
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-12">
        Developmental milestones from 2 to 60 months — communication, motor, and more
      </p>

      {/* Timeline line — horizontal on large screens */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-full max-w-4xl bg-gradient-to-r from-blue-400 to-purple-500 rounded-full hidden lg:block"
        aria-hidden
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-4 lg:gap-6 relative z-10">
        {MILESTONES.map((milestone, index) => {
          const imageSrc = ASQ3_MILESTONES[milestone.domain];
          return (
            <motion.div
              key={milestone.age}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="group flex flex-col items-center text-center"
            >
              <div className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 mb-3 sm:mb-6 rounded-2xl lg:rounded-3xl bg-gradient-to-br from-blue-500 to-purple-500 p-1 shadow-xl group-hover:scale-110 transition-transform duration-300">
                <div className="w-full h-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl lg:rounded-[22px] flex items-center justify-center shadow-inner overflow-hidden">
                  {imageSrc ? (
                    <img
                      src={imageSrc}
                      alt={`${milestone.age} months`}
                      className="w-14 h-14 sm:w-20 sm:h-20 lg:w-24 lg:h-24 object-contain"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                        const parent = el.parentElement;
                        if (parent) {
                          const fallback = document.createElement("span");
                          fallback.className = "text-2xl sm:text-3xl";
                          fallback.setAttribute("aria-hidden", "true");
                          fallback.textContent = milestone.icon;
                          parent.appendChild(fallback);
                        }
                      }}
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl" aria-hidden>
                      {milestone.icon}
                    </span>
                  )}
                </div>
              </div>
              <div className="font-bold text-lg sm:text-xl lg:text-2xl text-gray-900 dark:text-gray-100 mb-1">
                {milestone.age}mo
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
                {milestone.domain.replace(/_?\d+mo$/, "").replace("_", " ")}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
