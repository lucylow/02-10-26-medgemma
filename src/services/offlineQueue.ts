/**
 * Offline queue for MedGemma / screening payloads.
 * Never block care because the model is unavailable.
 */

const STORAGE_KEY = 'pediscreen_offline_queue';

export interface QueuedScreening {
  id: string;
  type: 'medgemma_draft';
  payload: {
    childAge: string;
    domain: string;
    observations: string;
    imagePreview?: string | null;
    imageFile?: { name: string; base64?: string } | null;
  };
  queuedAt: number;
}

function getQueue(): QueuedScreening[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setQueue(queue: QueuedScreening[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.warn('Failed to save offline queue:', e);
  }
}

export function enqueue(screening: Omit<QueuedScreening, 'id' | 'queuedAt'>): void {
  const queue = getQueue();
  const item: QueuedScreening = {
    ...screening,
    id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    queuedAt: Date.now(),
  };
  queue.push(item);
  setQueue(queue);
}

export function dequeue(id: string): QueuedScreening | null {
  const queue = getQueue();
  const idx = queue.findIndex((q) => q.id === id);
  if (idx < 0) return null;
  const [item] = queue.splice(idx, 1);
  setQueue(queue);
  return item;
}

export function getQueueStatus(): QueuedScreening[] {
  return getQueue();
}

export function clearQueue(): void {
  setQueue([]);
}
