import { useCallback, useState } from 'react';

interface UseDataExportReturn {
  isExporting: boolean;
  error: string | null;
  exportUserData: (includeActivityLog?: boolean) => Promise<boolean>;
}

export function useDataExport(): UseDataExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportUserData = useCallback(
    async (includeActivityLog = false): Promise<boolean> => {
      try {
        setIsExporting(true);
        setError(null);

        const exportUrl = new URL('/api/export', window.location.origin);
        if (includeActivityLog) {
          exportUrl.searchParams.set('includeActivityLog', 'true');
        }

        const response = await fetch(exportUrl.toString(), {
          method: 'GET',
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to generate export');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orasan-export-${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'An error occurred';
        setError(message);
        return false;
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return { isExporting, error, exportUserData };
}
