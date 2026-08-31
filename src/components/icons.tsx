import { MOON_PHASE_NAMES_AR } from '../domain/moon';
import { DIRECTION_NAMES_AR } from '../domain/wind';
import type { DirectionCode } from '../domain/types';
import type { ReactNode } from 'react';

interface UiIconProps {
  size?: number;
  className?: string;
}

function SvgIcon({ size = 18, className, children }: UiIconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function LocationIcon(props: UiIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </SvgIcon>
  );
}

export function CalendarIcon(props: UiIconProps) {
  return (
    <SvgIcon {...props}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </SvgIcon>
  );
}

export function ClockIcon(props: UiIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </SvgIcon>
  );
}

export function RefreshIcon(props: UiIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M20 7v5h-5" />
      <path d="M4.8 16.5A8 8 0 0 0 20 12M4 12A8 8 0 0 1 19.2 7.5" />
      <path d="M4 17v-5h5" />
    </SvgIcon>
  );
}

export function WindIcon(props: UiIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M3 8h11.5a2.5 2.5 0 1 0-2.2-3.7" />
      <path d="M3 12h15a2.5 2.5 0 1 1-2.2 3.7" />
      <path d="M3 16h7" />
    </SvgIcon>
  );
}

export function DropletIcon(props: UiIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M12 3s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11Z" />
      <path d="M9 15.2a3.2 3.2 0 0 0 3 2" />
    </SvgIcon>
  );
}

export function GustIcon(props: UiIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M3 7h9a2 2 0 1 0-1.7-3" />
      <path d="M3 11h16" />
      <path d="m13 14-2 4h3l-1 3 5-6h-3l1-1" />
    </SvgIcon>
  );
}

export function CompassIcon(props: UiIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </SvgIcon>
  );
}

export function SparklesIcon(props: UiIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
      <path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z" />
      <path d="m5 13 .7 2.3L8 16l-2.3.7L5 19l-.7-2.3L2 16l2.3-.7L5 13Z" />
    </SvgIcon>
  );
}

export function SunIcon({ setting = false, ...props }: UiIconProps & { setting?: boolean }) {
  return (
    <SvgIcon {...props}>
      <path d="M4 19h16" />
      <path d={setting ? 'M7 16a5 5 0 0 1 10 0' : 'M7 17a5 5 0 0 1 10 0'} />
      <path d={setting ? 'M12 3v4M5 9l2 2M19 9l-2 2' : 'M12 4v4M5 10l2 2M19 10l-2 2'} />
    </SvgIcon>
  );
}

export function ThermometerIcon(props: UiIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M14 14.76V4.5a2.5 2.5 0 0 0-5 0v10.26a4.5 4.5 0 1 0 5 0Z" />
    </SvgIcon>
  );
}

export function RainIcon(props: UiIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="M17.5 15.5a4.5 4.5 0 0 0-.9-8.92 6 6 0 0 0-11.44 1.6A3.75 3.75 0 0 0 6 15.5" />
      <path d="M9 18.5 8 21M13 18.5 12 21M17 18.5 16 21" />
    </SvgIcon>
  );
}

export function InfoIcon(props: UiIconProps) {
  return (
    <SvgIcon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </SvgIcon>
  );
}

export function ChevronIcon(props: UiIconProps) {
  return (
    <SvgIcon {...props}>
      <path d="m8 10 4 4 4-4" />
    </SvgIcon>
  );
}

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
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill={index === 4 ? light : dark}
        stroke="var(--moon-edge)"
      />
      {index !== 0 && index !== 4 ? <path d={waxing ? rightHalf : leftHalf} fill={light} /> : null}
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
