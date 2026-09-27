import { useMemo } from 'react';

/**
 * A self-contained SVG map.
 *
 * Google Maps needs a billed API key, which this build does not assume, so
 * routes and live positions render on a projected SVG canvas instead. It is
 * accurate enough to read a bus's progress along its route, and it costs
 * nothing and works offline. Swap in the Maps JS API here once a key exists;
 * the props (points, path, marker) already match what a map component needs.
 */
export default function MiniMap({
  path = [],
  markers = [],
  hub = null,
  height = 240,
  padding = 26,
  showLabels = true,
  className = '',
}) {
  const all = useMemo(
    () => [...path, ...markers, ...(hub ? [hub] : [])]
      .filter((p) => Number.isFinite(p?.lat) && Number.isFinite(p?.lng)),
    [path, markers, hub]
  );

  const view = useMemo(() => {
    if (!all.length) return null;
    const lats = all.map((p) => p.lat);
    const lngs = all.map((p) => p.lng);
    // Pad the bounds so a single point or a straight line still has room.
    const spread = Math.max(0.12, Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
    const cLat = (Math.max(...lats) + Math.min(...lats)) / 2;
    const cLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
    const half = spread * 0.62;
    return { minLat: cLat - half, maxLat: cLat + half, minLng: cLng - half, maxLng: cLng + half };
  }, [all]);

  if (!view) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-line bg-paper-2 text-xs text-ink-soft"
           style={{ height }}>
        No map data for this route yet
      </div>
    );
  }

  const W = 600;
  const H = height;
  // Equirectangular projection; fine at this scale, and it keeps the bus on
  // the right side of the line without pulling in a projection library.
  const x = (lng) => padding + ((lng - view.minLng) / (view.maxLng - view.minLng)) * (W - padding * 2);
  const y = (lat) => H - padding - ((lat - view.minLat) / (view.maxLat - view.minLat)) * (H - padding * 2);

  const line = path.map((p) => `${x(p.lng).toFixed(1)},${y(p.lat).toFixed(1)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full rounded-xl border border-line bg-[#f3efe4] ${className}`}
      style={{ height }}
      role="img"
      aria-label={`Route map from ${path[0]?.name ?? 'origin'} to ${path.at(-1)?.name ?? 'destination'}`}
    >
      <defs>
        <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M30 0 L0 0 0 30" fill="none" stroke="#e2d9c6" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />

      {/* A hub trip is spokes out and back, not a line through everything. */}
      {hub
        ? path
            .filter((p) => p.name !== hub.name)
            .map((p) => (
              <line
                key={`spoke-${p.name}`}
                x1={x(hub.lng)} y1={y(hub.lat)} x2={x(p.lng)} y2={y(p.lat)}
                stroke="#2a1a5e" strokeOpacity="0.35" strokeWidth="2.5"
                strokeLinecap="round" strokeDasharray="6 5"
              />
            ))
        : path.length > 1 && (
            <>
              <polyline points={line} fill="none" stroke="#2a1a5e" strokeOpacity="0.18" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points={line} fill="none" stroke="#2a1a5e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 0" />
            </>
          )}

      {path.map((p, i) => {
        const anchor = hub ? p.name === hub.name : i === 0 || i === path.length - 1;
        return (
          <g key={`${p.name}-${i}`}>
            <circle cx={x(p.lng)} cy={y(p.lat)} r={anchor ? 7 : 4.5}
                    fill={anchor ? '#2a1a5e' : '#fff'}
                    stroke="#2a1a5e" strokeWidth="2" />
            {showLabels && p.name && (
              <text x={x(p.lng)} y={y(p.lat) - 12} textAnchor="middle"
                    fontSize="12" fontWeight={anchor ? '700' : '600'} fill="#201436">
                {p.name}
              </text>
            )}
          </g>
        );
      })}

      {markers.map((m, i) => (
        <g key={`m-${i}`} transform={`translate(${x(m.lng)}, ${y(m.lat)})`}>
          <circle r="13" fill="#e8930c" fillOpacity="0.25" className="live-dot" />
          <circle r="7" fill="#e8930c" stroke="#fff" strokeWidth="2.5" />
          {m.label && (
            <text y="-19" textAnchor="middle" fontSize="12" fontWeight="700" fill="#b8392e">
              {m.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
