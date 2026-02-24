'use client';

import { useState, useEffect } from 'react';
import { UltraSkeletonDashboard } from '@/components/loading/UltraSkeleton';
import { UltraPatientDashboard } from '@/components/dashboard/UltraPatientDashboard';

/**
 * Ultra-functional dashboard: skeleton → real data for perceived instant functionality.
 */
export default function UltraDashboard() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    return <UltraSkeletonDashboard />;
  }

  return <UltraPatientDashboard />;
}
