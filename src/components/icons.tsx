import { MOON_PHASE_NAMES_AR } from '../domain/moon';
import { DIRECTION_NAMES_AR } from '../domain/wind';
import type { DirectionCode } from '../domain/types';

/** القسم 7.2 — أيقونة مرحلة القمر؛ الجزء المضيء يمين في التزايد ويسار في التناقص. */
export function MoonIcon({ index, size = 22 }: { index: number | null; size?: number }) {
  if (index === null) {
    return (
      <span className="moon moon--unknown" aria-hidden="true">
        —
      </span>
    );
  }

  const radius = 10;
  const dark = 'var(--moon-dark)';
  const light = 'var(--moon-light)';
  const rightHalf = 'M12 2 A10 10 0 0 1 12 22 Z';
  const leftHalf = 'M12 2 A10 10 0 0 0 12 22 Z';

  const waxing = index >= 1 && index <= 3;
  const waning = index >= 5 && index <= 7;
  const gibbous = index === 3 || index === 5;
  const crescent = index === 1 || index === 7;
  const ellipseRx = crescent || gibbous ? radius * 0.707 : 0;

  return (
    <svg
      className="moon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={`مرحلة القمر: ${MOON_PHASE_NAMES_AR[index]}`}
    >
      <circle cx="12" cy="12" r={radius} fill={index === 4 ? light : dark} stroke="var(--moon-edge)" />
      {index !== 0 && index !== 4 ? (
        <path d={waxing ? rightHalf : leftHalf} fill={light} />
      ) : null}
      {ellipseRx > 0 ? (
        <ellipse cx="12" cy="12" rx={ellipseRx} ry={radius} fill={gibbous ? light : dark} />
      ) : null}
      {waning || waxing || index === 0 ? (
        <circle cx="12" cy="12" r={radius} fill="none" stroke="var(--moon-edge)" />
      ) : null}
    </svg>
  );
}

/**
 * القسم 18.4 — البوصلة تشير إلى مصدر الرياح، ويصاحبها دائمًا نص «قادمة من».
 * الدرجة 0 للأعلى (شمال)، والسهم يمتد من المركز نحو المصدر.
 */
export function WindSourceArrow({
  degree,
  direction,
  size = 34
}: {
  degree: number | null;
  direction: DirectionCode | null;
  size?: number;
}) {
  if (degree === null || direction === null) {
    return <span aria-hidden="true">—</span>;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className="compass"
      role="img"
      aria-label={`الرياح قادمة من ${DIRECTION_NAMES_AR[direction]} عند ${Math.round(degree)} درجة`}
    >
      <circle cx="20" cy="20" r="17" className="compass__ring" />
      <text x="20" y="8" className="compass__north" textAnchor="middle">
        ش
      </text>
      <g transform={`rotate(${degree} 20 20)`}>
        <line x1="20" y1="20" x2="20" y2="7" className="compass__needle" />
        <polygon points="20,3 16.5,10 23.5,10" className="compass__head" />
      </g>
      <circle cx="20" cy="20" r="2" className="compass__hub" />
    </svg>
  );
}
