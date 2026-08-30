import { useId, useRef, useState } from 'react';
import { SEVERITY_SHORT_LABELS } from '../config/appConfig';
import { displayNumber } from '../domain/narrative';
import { formatHour12 } from '../domain/time';
import { DIRECTION_NAMES_AR, describeWindReason, getWindReasonCode } from '../domain/wind';
import type { HourlyWeatherPoint } from '../domain/types';

export type BarKind = 'wind' | 'humidity';

interface HourBarProps {
  hours: HourlyWeatherPoint[];
  /** توافق انتقالي مع المكوّن القديم؛ غيابه يرسم الطبقتين المدمجتين. */
  kind?: BarKind;
  label: string;
  /** موضع علامة «الآن» كساعة كسرية 0–24، أو null لليوم غير الحالي. */
  nowHour?: number | null;
  showAxis?: boolean;
  /** الساعات الماضية تُخفَّف بصريًا مع بقائها مقروءة (القسم 10.2). */
  dimBefore?: number | null;
}

function describeMeasurements(point: HourlyWeatherPoint): string[] {
  const parts = [formatHour12(point.localHour)];

  if (point.direction && point.windDegree !== null) {
    parts.push(`قادمة من ${DIRECTION_NAMES_AR[point.direction]} ${Math.round(point.windDegree)}°`);
  }
  parts.push(`سرعة ${displayNumber(point.windSpeedKmh)} كم/س`);
  parts.push(`هبّة ${displayNumber(point.windGustKmh)} كم/س`);
  parts.push(`رطوبة ${displayNumber(point.humidity)}%`);
  return parts;
}

/** نص التلميح لكل ساعة: الوقت والاتجاه والسرعة والهبّة والرطوبة وسبب اللون (القسم 9.3). */
export function describeHour(point: HourlyWeatherPoint): string {
  const parts = describeMeasurements(point);

  if (point.windSeverity) {
    const reason =
      point.direction && point.windSpeedKmh !== null
        ? describeWindReason(getWindReasonCode(point.direction, point.windSpeedKmh), point.direction)
        : '';
    parts.push(`رياح ${SEVERITY_SHORT_LABELS[point.windSeverity]}${reason ? ` — ${reason}` : ''}`);
  }
  if (point.humiditySeverity) {
    parts.push(`رطوبة ${SEVERITY_SHORT_LABELS[point.humiditySeverity]}`);
  }
  if (point.directionSmoothed) {
    parts.push('اتجاه مُدمج مع الساعات المحيطة');
  }

  return parts.join(' · ');
}

/** القراءة المرئية المختصرة؛ أسماء الألوان تبقى في وصف الوصول فقط. */
export function describeHourValues(point: HourlyWeatherPoint): string {
  return describeMeasurements(point).join(' · ');
}

/**
 * شريط ساعي مركّب من 24 خلية: النصف الأعلى للرياح والأسفل للرطوبة.
 * التنقل بلوحة المفاتيح داخل الشريط بالأسهم مع محطة Tab واحدة (القسم 21.7)،
 * والتفاصيل تُعرض في لوحة نصية أسفل الشريط لا في تلميح يعتمد على Hover وحده.
 *
 * اللمس يُعالَج على مستوى الشريط كله لا على الخلية: الخلية عرضها ~10 بكسل على
 * شاشة 320، فإصابتها بالإصبع شبه مستحيلة. الشريط بارتفاع 44 بكسل يستقبل اللمسة
 * ويحسب الساعة من موضعها، والسحب يصحّح الاختيار بلا رفع الإصبع. الخلايا تبقى
 * عناصر `option` لقارئة الشاشة ولوحة المفاتيح.
 */
export function HourBar({
  hours,
  kind,
  label,
  nowHour = null,
  showAxis = false,
  dimBefore = null
}: HourBarProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const cellId = (index: number) => `${listId}-h${index}`;

  const byHour = new Map(hours.map((point) => [point.localHour, point]));
  const slots = Array.from({ length: 24 }, (_, hour) => byHour.get(hour) ?? null);

  const move = (delta: number) => {
    // أول ضغطة سهم تختار طرف الشريط لا الساعة التالية له.
    setSelected((previous) =>
      previous === null
        ? delta > 0
          ? 0
          : 23
        : Math.min(23, Math.max(0, previous + delta))
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      // في RTL يتقدم السهم الأيسر إلى الساعة التالية.
      case 'ArrowLeft':
        move(1);
        break;
      case 'ArrowRight':
        move(-1);
        break;
      case 'Home':
        setSelected(0);
        break;
      case 'End':
        setSelected(23);
        break;
      case 'Escape':
        setSelected(null);
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  /** الساعة تحت المؤشر، محسوبة من الموضع الأفقي مع احترام اتجاه RTL. */
  const hourAt = (clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const isRtl = getComputedStyle(track).direction === 'rtl';
    const ratio = isRtl ? (rect.right - clientX) / rect.width : (clientX - rect.left) / rect.width;
    return Math.min(23, Math.max(0, Math.floor(ratio * 24)));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // الالتقاط يُبقي السحب متصلًا لو خرج الإصبع خارج حدود الشريط.
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // مؤشر غير نشط (حدث مُركَّب) — السحب يستمر بلا التقاط.
    }
    setIsScrubbing(true);
    setSelected(hourAt(event.clientX));
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    // الفأرة تتبع المؤشر بلا ضغط؛ اللمس والقلم يتطلبان سحبًا بعد الضغط.
    if (!isScrubbing && event.pointerType !== 'mouse') return;
    setSelected(hourAt(event.clientX));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsScrubbing(false);
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    // الاختيار باللمس يبقى ظاهرًا بعد رفع الإصبع؛ الفأرة وحدها تمسحه بالمغادرة.
    if (event.pointerType === 'mouse' && !isScrubbing) setSelected(null);
  };

  const selectedPoint = selected === null ? null : slots[selected];

  return (
    <div className={`hourbar${nowHour !== null ? ' hourbar--has-now' : ''}`}>
      <div
        ref={trackRef}
        className="hourbar__track"
        role="listbox"
        aria-label={label}
        tabIndex={0}
        aria-activedescendant={selected === null ? undefined : cellId(selected)}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setSelected(null);
        }}
      >
        {slots.map((point, hour) => {
          const dimmed = dimBefore !== null && hour < dimBefore;
          return (
            <div
              key={hour}
              id={cellId(hour)}
              role="option"
              aria-selected={selected === hour}
              aria-label={point ? describeHour(point) : `${formatHour12(hour)} · لا بيانات`}
              className={[
                'hourbar__cell',
                kind ? 'hourbar__cell--single' : '',
                dimmed ? 'is-dim' : '',
                selected === hour ? 'is-selected' : ''
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {kind !== 'humidity' ? (
                <span
                  className={`hourbar__lane hourbar__lane--wind hourbar__lane--${point?.windSeverity ?? 'missing'}`}
                  aria-hidden="true"
                />
              ) : null}
              {kind !== 'wind' ? (
                <span
                  className={`hourbar__lane hourbar__lane--humidity hourbar__lane--${point?.humiditySeverity ?? 'missing'}`}
                  aria-hidden="true"
                />
              ) : null}
            </div>
          );
        })}
        {nowHour !== null ? (
          <span
            className="hourbar__now"
            style={{ insetInlineStart: `${(nowHour / 24) * 100}%` }}
            aria-hidden="true"
          >
            <span className="hourbar__now-label">الآن</span>
          </span>
        ) : null}
      </div>

      {showAxis ? (
        <div className="hourbar__axis" aria-hidden="true">
          {['00', '06', '12', '18', '24'].map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
      ) : null}

      <p className="hourbar__readout" aria-live="polite">
        {selectedPoint
          ? describeHourValues(selectedPoint)
          : selected !== null
            ? `${formatHour12(selected)} · لا بيانات لهذه الساعة`
            : ''}
      </p>
    </div>
  );
}
