/**
 * API configuration for MedGemma backend
 * Uses existing backend /api/stream-analyze (SSE) or /medgemma/stream
 */

export const API_BASE =
  process.env.EXPO_PUBLIC_MEDGEMMA_API_URL ||
  (__DEV__ ? 'http://localhost:8000' : 'https://api.pediscreen.ai');

export const MEDGEMMA_STREAM_URL = `${API_BASE}/api/stream-analyze`;
