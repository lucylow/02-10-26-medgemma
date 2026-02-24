"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HUMANIZED_PATIENTS,
  HIGH_RISK_PATIENTS,
} from "@/data/clinical/HumanizedMockData";
import { PatientRow } from "@/components/patients/PatientRow";

const INITIAL_PAGE_SIZE = 100;
const LOAD_MORE_SIZE = 100;

type FilterRisk = "all" | "referral" | "urgent";

export function HumanCenteredPatientList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterRisk, setFilterRisk] = useState<FilterRisk>("all");
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);

  const filteredPatients = useMemo(() => {
    const lower = search.toLowerCase().trim();
    return HUMANIZED_PATIENTS.filter((p) => {
      const matchesSearch =
        !lower ||
        p.name.preferred.toLowerCase().includes(lower) ||
        p.name.first.toLowerCase().includes(lower) ||
        p.name.last.toLowerCase().includes(lower) ||
        p.chw.assigned.toLowerCase().includes(lower) ||
        p.mrn.toLowerCase().includes(lower);
      const matchesRisk =
        filterRisk === "all" || p.clinical.risk_level === filterRisk;
      return matchesSearch && matchesRisk;
    });
  }, [search, filterRisk]);

  const visiblePatients = useMemo(
    () => filteredPatients.slice(0, visibleCount),
    [filteredPatients, visibleCount]
  );

  const hasMore = visibleCount < filteredPatients.length;

  // Keep selected index in bounds when filter/search changes
  useEffect(() => {
    setSelectedIndex((prev) =>
      Math.min(prev, Math.max(0, filteredPatients.length - 1))
    );
  }, [filteredPatients.length]);

  // Keyboard navigation (Tab/Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, filteredPatients.length - 1)
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filteredPatients[selectedIndex]) {
        e.preventDefault();
        navigate(`/pediscreen/case/${filteredPatients[selectedIndex].id}`);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredPatients, selectedIndex, navigate]);

  const handleRowClick = (id: string) => {
    navigate(`/pediscreen/case/${id}`);
  };

  const handleLoadMore = () => {
    setVisibleCount((c) => Math.min(c + LOAD_MORE_SIZE, filteredPatients.length));
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8 sm:mb-12 items-center justify-between bg-white/70 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-3xl sm:text-4xl" aria-hidden="true">
            👶
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2">
              Patient List
            </h1>
            <p className="text-lg sm:text-xl text-gray-600">
              {filteredPatients.length.toLocaleString()} of{" "}
              {HUMANIZED_PATIENTS.length.toLocaleString()} total patients
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center w-full lg:w-auto">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patients (Sofia, Amir…)"
            aria-label="Search patients by name, CHW, or MRN"
            className="w-full max-w-md px-6 py-4 border-2 border-gray-200 rounded-3xl text-lg font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-lg hover:shadow-xl transition-all"
          />
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value as FilterRisk)}
            aria-label="Filter by risk level"
            className="px-6 py-4 border-2 border-gray-200 rounded-3xl text-lg font-semibold focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            <option value="all">All Risk Levels</option>
            <option value="referral">
              🚨 REFERRALS ONLY ({HIGH_RISK_PATIENTS.length.toLocaleString()})
            </option>
            <option value="urgent">⚠️ URGENT ONLY</option>
          </select>
        </div>
      </div>

      {/* Keyboard-navigable patient list */}
      <div className="space-y-4" role="list">
        {visiblePatients.map((patient, index) => (
          <div key={patient.id} role="listitem">
            <PatientRow
              patient={patient}
              isSelected={index === selectedIndex}
              onClick={() => handleRowClick(patient.id)}
              tabIndex={index === selectedIndex ? 0 : -1}
            />
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="text-center mt-8 sm:mt-12">
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLoadMore}
            className="min-h-[60px] min-w-[200px] px-8 sm:px-12 py-4 sm:py-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-lg sm:text-xl font-black rounded-3xl shadow-2xl hover:shadow-3xl transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-purple-500/50"
            aria-label={`Load more patients (${Math.min(LOAD_MORE_SIZE, filteredPatients.length - visibleCount)} more)`}
          >
            Load {Math.min(LOAD_MORE_SIZE, filteredPatients.length - visibleCount)}{" "}
            More Patients →
          </motion.button>
        </div>
      )}

      {filteredPatients.length === 0 && (
        <p className="text-center text-gray-500 py-12 text-lg">
          No patients match your search. Try a different name or filter.
        </p>
      )}
    </div>
  );
}
