'use client';

import { motion } from 'framer-motion';
import type { UltraPatient } from '@/data/ultra/HyperRealisticData';

interface PatientTableViewProps {
  patients: UltraPatient[];
}

export function PatientTableView({ patients }: PatientTableViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-3xl border-2 border-gray-200 bg-white/90 backdrop-blur-xl shadow-xl overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-slate-50 to-gray-100">
              <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-600">
                Patient
              </th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-600">
                CHW
              </th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-600">
                Location
              </th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-600">
                Age (mo)
              </th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-600">
                Risk
              </th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-600">
                Conf.
              </th>
              <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-600">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient, index) => (
              <motion.tr
                key={patient.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.01 }}
                className="border-b border-gray-100 hover:bg-blue-50/80 transition-colors cursor-pointer"
                onClick={() =>
                  (window.location.href = `/pediscreen/patient/${patient.id}`)
                }
              >
                <td className="px-6 py-4">
                  <span className="font-bold text-gray-900">
                    {patient.profile.preferredName}
                  </span>
                  <span className="text-gray-500 text-sm ml-2">
                    {patient.mrn}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-700">
                  {patient.profile.chwAssigned}
                </td>
                <td className="px-6 py-4 text-gray-600 text-sm">
                  {patient.profile.location.country} •{' '}
                  {patient.profile.location.village}
                </td>
                <td className="px-6 py-4 font-semibold text-gray-800">
                  {patient.vitals.age_months}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-3 py-1 rounded-xl font-black text-sm ${
                      patient.screenings.risk_level === 'referral'
                        ? 'bg-red-100 text-red-700'
                        : patient.screenings.risk_level === 'urgent'
                          ? 'bg-orange-100 text-orange-700'
                          : patient.screenings.risk_level === 'monitor'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {patient.screenings.risk_level.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 font-black text-gray-800">
                  {(patient.screenings.confidence * 100).toFixed(0)}%
                </td>
                <td className="px-6 py-4">
                  {patient.status.needs_followup ? (
                    <span className="text-orange-600 font-semibold">
                      📞 Follow-up
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-semibold">
                      ✅ Done
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
