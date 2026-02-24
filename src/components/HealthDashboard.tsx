// src/components/HealthDashboard.tsx - Full integration
import React from "react";

import { VitalsDashboard } from "@/components/VitalsDashboard";
import { DevelopmentalTrends } from "@/components/DevelopmentalTrends";
import { RiskTimeline } from "@/components/RiskTimeline";
import { Button } from "@/components/ui/button";

export function HealthDashboard() {
  return (
    <div className="space-y-8 max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-gray-900 to-emerald-900 bg-clip-text text-transparent mb-4">
          PediScreen AI Health Dashboard
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Real-time vitals monitoring + longitudinal developmental trends
        </p>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <VitalsDashboard />
        <DevelopmentalTrends />
        <div className="lg:col-span-2">
          <RiskTimeline />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-12 border-t border-gray-200">
        <Button size="lg" className="bg-gradient-to-r from-emerald-600 to-green-600 text-xl px-12">
          📊 Export Full Report
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 text-xl px-12"
        >
          👨‍⚕️ Share with Pediatrician
        </Button>
      </div>
    </div>
  );
}

