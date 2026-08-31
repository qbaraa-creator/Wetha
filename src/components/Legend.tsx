import { useState } from 'react';
import { HUMIDITY_THRESHOLDS, SPEED_THRESHOLDS } from '../config/appConfig';
import { SeverityBadge } from './SeverityBadge';
import { ChevronIcon, InfoIcon } from './icons';

/** القسم 9.2.د — مفتاح الألوان: يشرح الاتجاه والسرعة والدمج والرطوبة ودور الهبّات. */
export function Legend() {
  const [open, setOpen] = useState(false);

  return (
    <section className="legend" aria-labelledby="legend-title">
      <button
        type="button"
        className="legend__toggle"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span id="legend-title">
          <InfoIcon size={17} /> مفتاح الألوان وكيفية القراءة
        </span>
        <ChevronIcon size={18} />
      </button>

      {open ? (
        <div className="legend__body">
          <div className="legend__group">
            <h3>لون اتجاه الرياح</h3>
            <ul>
              <li>
                <SeverityBadge severity="green" /> شمالية · شمالية غربية
              </li>
              <li>
                <SeverityBadge severity="orange" /> شمالية شرقية · شرقية · غربية
              </li>
              <li>
                <SeverityBadge severity="red" /> جنوبية · جنوبية شرقية · جنوبية غربية
              </li>
            </ul>
            <p className="legend__note">
              الاتجاه هو الجهة التي تأتي منها الرياح، لا التي تتجه إليها.
            </p>
          </div>

          <div className="legend__group">
            <h3>عتبات سرعة الرياح</h3>
            <ul>
              <li>
                <SeverityBadge severity="red" /> أقل من {SPEED_THRESHOLDS.greenMinKmh} كم/س
              </li>
              <li>
                <SeverityBadge severity="green" /> من {SPEED_THRESHOLDS.greenMinKmh} إلى أقل من{' '}
                {SPEED_THRESHOLDS.strongMinKmh} كم/س
              </li>
              <li>
                <SeverityBadge severity="orange" /> من {SPEED_THRESHOLDS.strongMinKmh} إلى أقل من{' '}
                {SPEED_THRESHOLDS.severeMinKmh} كم/س · قوية
              </li>
              <li>
                <SeverityBadge severity="red" /> {SPEED_THRESHOLDS.severeMinKmh} كم/س فأكثر · شديدة
              </li>
            </ul>
          </div>

          <div className="legend__group">
            <h3>لون شريط الرياح</h3>
            <p className="legend__note">
              يجمع الاتجاه والسرعة ويأخذ الحالة الأسوأ بينهما. مثال: رياح جنوبية غربية بسرعة 40 كم/س
              تبقى في الحالة الأشد لأن اتجاهها كذلك.
            </p>
            <p className="legend__note">
              الهبّات تُعرض كرقم مستقل ولا تدخل في حساب اللون في هذا الإصدار.
            </p>
          </div>

          <div className="legend__group">
            <h3>عتبات الرطوبة</h3>
            <ul>
              <li>
                <SeverityBadge severity="green" /> أقل من {HUMIDITY_THRESHOLDS.greenMaxExclusive}%
              </li>
              <li>
                <SeverityBadge severity="orange" /> من {HUMIDITY_THRESHOLDS.greenMaxExclusive}% إلى
                أقل من {HUMIDITY_THRESHOLDS.redMinInclusive}%
              </li>
              <li>
                <SeverityBadge severity="red" /> {HUMIDITY_THRESHOLDS.redMinInclusive}% فأكثر
              </li>
            </ul>
            <p className="legend__note">
              لا يوجد تقييم طقس عام يخلط الرياح بالرطوبة؛ المساران مستقلان.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
