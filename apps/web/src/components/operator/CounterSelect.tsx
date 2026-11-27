'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface CounterOption {
  id: string;
  label: string;
}

export interface CounterSelectProps {
  queueCode: string;
  value?: string;
  onChange: (counterId: string) => void;
  disabled?: boolean;
}

const storageKey = (queueCode: string) => `queue_counter_${queueCode}`;

export function CounterSelect({ queueCode, value, onChange, disabled }: CounterSelectProps) {
  const [counters, setCounters] = useState<CounterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);

    api<CounterOption[]>(`/queues/${encodeURIComponent(queueCode)}/counters`)
      .then((list) => {
        if (cancelled) return;
        setCounters(list);
        if (list.length > 0) {
          let chosen = value && list.some((c) => c.id === value) ? value : undefined;
          if (!chosen) {
            try {
              const saved = localStorage.getItem(storageKey(queueCode));
              if (saved && list.some((c) => c.id === saved)) {
                chosen = saved;
              }
            } catch {
              // Ignore localStorage unavailability
            }
          }
          if (!chosen) {
            chosen = list[0].id;
          }
          if (chosen !== value) {
            onChange(chosen);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueCode]);

  const handleChange = (nextId: string) => {
    onChange(nextId);
    try {
      localStorage.setItem(storageKey(queueCode), nextId);
    } catch {
      // Ignore localStorage unavailability
    }
  };

  if (loading) {
    return (
      <select
        disabled
        aria-label={`Counter for queue ${queueCode}`}
        data-testid={`counter-select-${queueCode}`}
        className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-500"
      >
        <option value="">Loading counters…</option>
      </select>
    );
  }

  if (loadError || counters.length === 0) {
    return (
      <select
        disabled
        aria-label={`Counter for queue ${queueCode}`}
        data-testid={`counter-select-${queueCode}`}
        className="w-full rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-500"
      >
        <option value="">{loadError ? 'Unable to load counters' : 'No counters'}</option>
      </select>
    );
  }

  return (
    <select
      aria-label={`Counter for queue ${queueCode}`}
      data-testid={`counter-select-${queueCode}`}
      value={value ?? counters[0]?.id ?? ''}
      disabled={disabled}
      onChange={(e) => handleChange(e.target.value)}
      className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {counters.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
