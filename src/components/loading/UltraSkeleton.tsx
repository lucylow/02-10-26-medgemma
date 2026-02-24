'use client';

import { motion } from 'framer-motion';

export function UltraSkeletonDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Skeleton header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 p-6 shadow-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-3 lg:grid-cols-5 gap-8 items-center">
          <div className="grid grid-cols-3 gap-6 text-center lg:col-span-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 }}
                className="h-20 p-4 rounded-2xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse shadow-lg"
                aria-hidden
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 lg:col-span-2">
            <div className="flex-1 h-16 px-6 py-4 rounded-2xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse shadow-md" />
            <div className="h-16 w-48 px-6 py-4 rounded-2xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse shadow-md" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-12 px-4 py-3 rounded-xl bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 animate-pulse"
                aria-hidden
              />
            ))}
          </div>
        </div>
      </div>

      {/* Skeleton grid */}
      <div className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group relative h-[360px] bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl animate-pulse overflow-hidden"
              style={{
                background:
                  'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
              }}
              aria-hidden
            >
              {/* Skeleton risk badge */}
              <div className="absolute top-6 right-6 w-24 h-24 rounded-2xl bg-gradient-to-r from-gray-300 to-gray-400 shadow-2xl" />

              {/* Skeleton photo + avatar */}
              <div className="flex items-start gap-4 mb-6 pt-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-r from-gray-300 to-gray-400 shadow-2xl overflow-hidden" />
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-r from-gray-300 to-gray-400 shadow-lg -mt-3 -mr-3" />
                <div className="flex-1 space-y-2">
                  <div className="h-8 w-48 rounded-xl bg-gradient-to-r from-gray-300 to-gray-400" />
                  <div className="h-6 w-32 rounded-lg bg-gradient-to-r from-gray-300 to-gray-400" />
                  <div className="h-5 w-40 rounded-md bg-gradient-to-r from-gray-300 to-gray-400" />
                </div>
              </div>

              {/* Skeleton metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="h-24 p-4 rounded-2xl bg-gradient-to-b from-gray-300 to-gray-400 shadow-md" />
                <div className="h-24 p-4 rounded-2xl bg-gradient-to-b from-gray-300 to-gray-400 shadow-md" />
              </div>

              {/* Skeleton story */}
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-gray-200 to-gray-300 border">
                <div className="h-16 space-y-2">
                  <div className="h-4 w-full rounded bg-gradient-to-r from-gray-300 to-gray-400" />
                  <div className="h-4 w-5/6 rounded bg-gradient-to-r from-gray-300 to-gray-400" />
                </div>
              </div>

              {/* Skeleton action */}
              <div className="flex items-center gap-3 pt-2">
                <div className="h-10 w-24 rounded-2xl bg-gradient-to-r from-gray-300 to-gray-400" />
                <div className="ml-auto h-12 w-32 px-4 py-3 rounded-2xl bg-gradient-to-r from-gray-300 to-gray-400 shadow-lg" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
