import { useState } from 'react';
import { HUMIDITY_THRESHOLDS, SPEED_THRESHOLDS } from '../config/appConfig';
import { SeverityBadge } from './SeverityBadge';

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
        <span id="legend-title">مفتاح الألوان وكيفية القراءة</span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        <div className="legend__body">
          <div className="legend__group">
            <h3>لون اتجاه الرياح</h3>
            <ul>
              <li>
                <SeverityBadge severity="green" label="أخضر" /> شمالية · شمالية غربية
              </li>
              <li>
                <SeverityBadge severity="orange" label="برتقالي" /> شمالية شرقية · شرقية · غربية
              </li>
              <li>
                <SeverityBadge severity="red" label="أحمر" /> جنوبية · جنوبية شرقية · جنوبية غربية
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
                <SeverityBadge severity="red" label="أحمر" /> {SPEED_THRESHOLDS.redMaxKmh} كم/س أو أقل
              </li>
              <li>
                <SeverityBadge severity="orange" label="برتقالي" /> أكثر من{' '}
                {SPEED_THRESHOLDS.redMaxKmh} وحتى {SPEED_THRESHOLDS.orangeMaxKmh} كم/س
              </li>
              <li>
                <SeverityBadge severity="green" label="أخضر" /> أكثر من {SPEED_THRESHOLDS.orangeMaxKmh}{' '}
                كم/س
              </li>
            </ul>
          </div>

          <div className="legend__group">
            <h3>لون شريط الرياح</h3>
            <p className="legend__note">
              يجمع الاتجاه والسرعة ويأخذ الحالة الأسوأ بينهما. مثال: رياح جنوبية غربية بسرعة 40 كم/س
              تبقى حمراء لأن اتجاهها أحمر.
            </p>
            <p className="legend__note">
              الهبّات تُعرض كرقم مستقل ولا تدخل في حساب اللون في هذا الإصدار.
            </p>
          </div>

          <div className="legend__group">
            <h3>عتبات الرطوبة</h3>
            <ul>
              <li>
                <SeverityBadge severity="green" label="أخضر" /> أقل من{' '}
                {HUMIDITY_THRESHOLDS.greenMaxExclusive}%
              </li>
              <li>
                <SeverityBadge severity="orange" label="برتقالي" /> من{' '}
                {HUMIDITY_THRESHOLDS.greenMaxExclusive}% إلى {HUMIDITY_THRESHOLDS.orangeMaxInclusive}%
              </li>
              <li>
                <SeverityBadge severity="red" label="أحمر" /> أكثر من{' '}
                {HUMIDITY_THRESHOLDS.orangeMaxInclusive}%
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
