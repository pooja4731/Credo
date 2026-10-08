/**
 * Skeleton rows for tables mid-fetch. Renders as <tr> elements so it can be
 * dropped directly inside an existing <tbody>.
 */
export default function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-olive-900/5 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3">
              <div
                className="h-3.5 animate-pulse rounded bg-olive-900/10"
                style={{ width: `${55 + ((r * 13 + c * 7) % 35)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
