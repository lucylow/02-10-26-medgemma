import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RiskChip } from "@/components/RiskChip";
import { medicalImage, CHW_IMAGES, ROP_IMAGES, UI_IMAGES } from "@/lib/images";

export function Hero() {
  return (
    <section
      className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 relative overflow-hidden"
      aria-label="PediScreen AI — Early detection saves lives"
    >
      {/* Background medical pattern */}
      <div className="absolute inset-0 opacity-20" aria-hidden>
        <img
          src={UI_IMAGES.medical_pattern}
          alt=""
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
      {/* Fallback gradient when no pattern */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(59,130,246,0.25)_0%,transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(139,92,246,0.2)_0%,transparent_50%)]"
        aria-hidden
      />

      {/* Floating ROP eye (optional; hidden if asset missing) */}
      <div className="absolute top-1/4 right-10 w-40 h-40 md:w-48 md:h-48 pointer-events-none hidden sm:block" aria-hidden>
        <img
          src={ROP_IMAGES.zone1_stage3 ?? medicalImage("rop/zone1/stage3.png")}
          alt=""
          className="w-full h-full object-contain opacity-60 animate-pulse"
          onError={(e) => {
            (e.target as HTMLImageElement).parentElement!.style.display = "none";
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 min-h-screen flex items-center justify-center">
        <div className="max-w-4xl text-center text-white space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex flex-col sm:flex-row items-center gap-4 bg-white/15 backdrop-blur-xl px-6 sm:px-8 py-6 rounded-3xl border border-white/20 shadow-2xl"
          >
            <img
              src={CHW_IMAGES.field_india}
              alt=""
              className="w-20 h-20 rounded-2xl object-cover border-2 border-white/40 shadow-lg"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight mb-2 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                PediScreen AI
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl opacity-90 font-medium text-white">
                Early detection saves lives
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center flex-wrap"
          >
            <RiskChip level="referral" size="lg">
              🚨 92% Sensitivity
            </RiskChip>
            <RiskChip level="ontrack" size="lg">
              ✅ Deployed in 47 countries
            </RiskChip>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center"
          >
            <Link
              to="/pediscreen/demo"
              className="group relative px-10 sm:px-12 py-5 sm:py-6 bg-white text-gray-900 rounded-3xl font-bold text-lg sm:text-xl shadow-2xl hover:shadow-[0_20px_50px_-12px_rgba(255,255,255,0.4)] transform hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10">🚀 Live Demo</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link
              to="/pediscreen"
              className="px-10 sm:px-12 py-5 sm:py-6 border-4 border-white/50 text-white rounded-3xl font-bold text-lg sm:text-xl backdrop-blur-xl hover:bg-white/20 transition-all duration-300"
            >
              Enter Dashboard
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
