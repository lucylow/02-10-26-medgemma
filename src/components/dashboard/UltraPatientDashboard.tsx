'use client';

import { useState, useMemo } from 'react';
import { ULTRA_PATIENTS } from '@/data/ultra/HyperRealisticData';
import { PatientGridView } from '@/components/patients/UltraPatientGrid';
import { PatientTableView } from '@/components/patients/PatientTableView';

type RiskFilter = 'all' | 'referral' | 'urgent';
type ViewMode = 'grid' | 'table';

const DISPLAY_CAP = 200;

export function UltraPatientDashboard() {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const filteredPatients = useMemo(() => {
    const searchLower = search.toLowerCase();
    return ULTRA_PATIENTS.filter(
      (patient) =>
        (riskFilter === 'all' ||
          patient.screenings.risk_level === riskFilter) &&
        (patient.profile.preferredName.toLowerCase().includes(searchLower) ||
          patient.profile.chwAssigned.toLowerCase().includes(searchLower))
    ).slice(0, DISPLAY_CAP);
  }, [riskFilter, search]);

  const stats = useMemo(
    () => ({
      total: ULTRA_PATIENTS.length,
      referrals: ULTRA_PATIENTS.filter(
        (p) => p.screenings.risk_level === 'referral'
      ).length,
      urgent: ULTRA_PATIENTS.filter(
        (p) => p.screenings.risk_level === 'urgent'
      ).length,
      avgConfidence:
        ULTRA_PATIENTS.reduce((sum, p) => sum + p.screenings.confidence, 0) /
        ULTRA_PATIENTS.length,
    }),
    []
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Ultra-dense header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/50 sticky top-0 z-50 p-6 shadow-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-3 lg:grid-cols-5 gap-8 items-center">
          {/* Live stats */}
          <div className="grid grid-cols-3 gap-6 text-center lg:col-span-2">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 border border-blue-200">
              <div className="text-3xl font-black text-blue-600">
                {stats.total.toLocaleString()}
              </div>
              <div className="text-xs uppercase tracking-wider text-blue-700 font-semibold">
                Total Patients
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-red-500/10 border border-red-200">
              <div className="text-3xl font-black text-red-600">
                {stats.referrals}
              </div>
              <div className="text-xs uppercase tracking-wider text-red-700 font-semibold">
                Referrals
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 border border-orange-200">
              <div className="text-3xl font-black text-orange-600">
                {stats.urgent}
              </div>
              <div className="text-xs uppercase tracking-wider text-orange-700 font-semibold">
                Urgent
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 lg:col-span-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Search 100K patients (Sofia, Maria...)"
              className="flex-1 px-6 py-4 rounded-2xl border-2 border-gray-200 bg-white/50 backdrop-blur-sm text-lg placeholder-gray-500 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-sm hover:shadow-md"
              aria-label="Search patients"
            />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskFilter)}
              className="px-6 py-4 rounded-2xl border-2 border-gray-200 bg-white/50 backdrop-blur-sm font-semibold focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-100"
              aria-label="Filter by risk level"
            >
              <option value="all">
                All Patients ({stats.total.toLocaleString()})
              </option>
              <option value="referral">🚨 REFERRALS ({stats.referrals})</option>
              <option value="urgent">⚠️ URGENT ({stats.urgent})</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-white/50 hover:bg-white text-gray-700 hover:shadow-md'
              }`}
              aria-pressed={viewMode === 'grid'}
            >
              🖼️ Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-3 rounded-xl font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-white/50 hover:bg-white text-gray-700 hover:shadow-md'
              }`}
              aria-pressed={viewMode === 'table'}
            >
              📋 Table
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic content */}
      <div className="max-w-7xl mx-auto p-8">
        {viewMode === 'grid' ? (
          <PatientGridView patients={filteredPatients} />
        ) : (
          <PatientTableView patients={filteredPatients} />
        )}
      </div>
    </div>
  );
}
