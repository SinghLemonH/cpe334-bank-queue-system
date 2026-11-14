'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface VersionInfo {
  version: string;
  commit: string;
}

/**
 * Footer on every page (Lab 5 R-08): the release name and the short commit SHA that the
 * API reports from GIT_SHA. Hover shows the full SHA. Renders nothing if /api/version fails.
 */
export function VersionFooter() {
  const [info, setInfo] = useState<VersionInfo | null>(null);

  useEffect(() => {
    api<VersionInfo>('/version')
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  if (!info) return null;

  const shortCommit = /^[0-9a-f]{40}$/.test(info.commit) ? info.commit.slice(0, 7) : info.commit;

  return (
    <footer className="py-4 text-center text-xs text-stone-500">
      <span data-testid="app-version" title={`commit ${info.commit}`}>
        v{info.version} · {shortCommit}
      </span>
    </footer>
  );
}
