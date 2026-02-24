'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import type { UltraPatient } from '@/data/ultra/HyperRealisticData';

interface PatientGridViewProps {
  patients: UltraPatient[];
}

function AvatarFallback({ name, className }: { name: string; className?: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  const hue = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className={`flex items-center justify-center rounded-2xl font-black text-white shadow-2xl overflow-hidden ${className ?? ''}`}
      style={{ backgroundColor: `hsl(${hue}, 55%, 45%)` }}
      aria-hidden
    >
      {initial}
    </div>
  );
}

export function PatientGridView({ patients }: PatientGridViewProps) {
  const [hoveredPatient, setHoveredPatient] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const markImgError = (key: string) => () =>
    setImgErrors((prev) => ({ ...prev, [key]: true }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
      {patients.map((patient, index) => (
        <motion.div
          key={patient.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.02 }}
          whileHover={{
            scale: 1.02,
            y: -8,
            boxShadow: '0 35px 60px -15px rgba(0, 0, 0, 0.3)',
          }}
          onHoverStart={() => setHoveredPatient(patient.id)}
          onHoverEnd={() => setHoveredPatient(null)}
          className="group relative bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-xl hover:shadow-3xl border-4 border-transparent hover:border-blue-200 transition-all overflow-hidden hover:cursor-pointer h-[360px] flex flex-col"
          onClick={() => (window.location.href = `/pediscreen/patient/${patient.id}`)}
        >
          {/* Risk badge - top right */}
          <div
            className={`absolute top-6 right-6 z-10 w-24 h-24 rounded-2xl flex items-center justify-center shadow-2xl font-black text-xl ${
              patient.screenings.risk_level === 'referral'
                ? 'bg-red-500 text-white'
                : patient.screenings.risk_level === 'urgent'
                  ? 'bg-orange-500 text-white'
                  : patient.screenings.risk_level === 'monitor'
                    ? 'bg-amber-500 text-white'
                    : 'bg-emerald-500 text-white'
            }`}
          >
            {patient.screenings.risk_level.slice(0, 3).toUpperCase()}
          </div>

          {/* Patient photo + CHW avatar */}
          <div className="flex items-start gap-4 mb-6 pt-6">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden ring-4 ring-white shadow-2xl bg-gradient-to-br from-gray-100 to-gray-200">
                {!imgErrors[`photo-${patient.id}`] ? (
                  <img
                    src={patient.profile.photo}
                    alt={patient.profile.firstName}
                    className="w-full h-full object-cover"
                    onError={markImgError(`photo-${patient.id}`)}
                  />
                ) : null}
                {(imgErrors[`photo-${patient.id}`] || !patient.profile.photo) && (
                  <AvatarFallback
                    name={patient.profile.firstName}
                    className="w-full h-full text-4xl"
                  />
                )}
              </div>
              <div className="absolute -bottom-3 -right-3 w-12 h-12 rounded-2xl ring-4 ring-white/50 shadow-lg overflow-hidden">
                <AvatarFallback
                  name={patient.profile.chwAssigned}
                  className="w-full h-full text-lg"
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-black text-gray-900 line-clamp-1 mb-1 group-hover:text-blue-600">
                {patient.profile.preferredName}
              </h3>
              <p className="text-lg text-gray-700 line-clamp-1">
                {patient.profile.chwAssigned}
              </p>
              <p className="text-sm text-gray-500 line-clamp-1">
                {patient.profile.location.country} •{' '}
                {patient.profile.location.village}
              </p>
            </div>
          </div>

          {/* Clinical metrics */}
          <div className="grid grid-cols-2 gap-4 mb-6 flex-1">
            <div className="text-center p-4 rounded-2xl bg-gradient-to-b from-blue-50 to-indigo-50 border border-blue-100">
              <div className="text-3xl font-black text-blue-700">
                {patient.vitals.age_months}
              </div>
              <div className="text-xs uppercase tracking-wider text-blue-600 font-semibold mt-1">
                Months
              </div>
            </div>
            <div className="text-center p-4 rounded-2xl bg-gradient-to-b from-emerald-50 to-teal-50 border border-emerald-100">
              <div
                className={`text-3xl font-black ${
                  patient.screenings.growth_z_weight > 0
                    ? 'text-emerald-700'
                    : patient.screenings.growth_z_weight > -2
                      ? 'text-amber-700'
                      : 'text-red-700'
                }`}
              >
                {patient.screenings.growth_z_weight.toFixed(1)}
              </div>
              <div className="text-xs uppercase tracking-wider text-emerald-600 font-semibold mt-1">
                Weight Z
              </div>
            </div>
          </div>

          {/* CHW story */}
          <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
            <p className="text-sm text-gray-700 leading-relaxed line-clamp-3">
              {patient.story.chw_note}
            </p>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-3 pt-2">
            <div className="text-2xl font-black text-gray-900">
              {(patient.screenings.confidence * 100).toFixed(0)}% conf.
            </div>
            <div
              className={`ml-auto px-6 py-3 rounded-2xl font-black text-sm shadow-lg ${
                patient.status.needs_followup
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-orange-500/50'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:shadow-emerald-500/50'
              }`}
            >
              {patient.status.needs_followup ? '📞 CALL NOW' : '✅ FOLLOWED UP'}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
