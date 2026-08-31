import { useState } from 'react';
import {
  DIRECTION_SECTORS,
  DIRECTION_SEVERITY,
  HUMIDITY_THRESHOLDS,
  SPEED_THRESHOLDS,
  STRONG_WIND_GREEN_DIRECTIONS
} from '../config/appConfig';
import { DIRECTION_NAMES_AR } from '../domain/wind';
import type { Severity } from '../domain/types';
import { SeverityBadge } from './SeverityBadge';
import { ChevronIcon, InfoIcon } from './icons';

/** مصفوفة واحدة من إعدادات الحساب نفسها؛ لا تتكرر العتبات في مفاتيح منفصلة. */
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
          <InfoIcon size={17} /> كيف يُحسب التقييم؟
        </span>
        <ChevronIcon size={18} />
      </button>

      {open ? (
        <div className="legend__body">
          <div className="legend__group legend__group--reading">
            <h3>مصفوفة الشروط</h3>
            <p className="legend__note">
              حالة الساعة هي الأشد بين الاتجاه والسرعة والرطوبة في الساعة نفسها، وليس متوسط ألوانها.
              يعرض الشريط حالة واحدة وتظهر جميع أسباب عدم المطابقة عند اختيار الساعة.
            </p>
            <table className="criteria-matrix">
              <caption className="sr-only">مصفوفة اتجاه الرياح وسرعتها والرطوبة</caption>
              <thead>
                <tr>
                  <th scope="col">المعيار</th>
                  {(['green', 'orange', 'red'] as Severity[]).map((severity) => (
                    <th scope="col" key={severity}>
                      <SeverityBadge severity={severity} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">الاتجاه</th>
                  {(['green', 'orange', 'red'] as Severity[]).map((severity) => (
                    <td key={severity}>
                      {DIRECTION_SECTORS.filter(
                        (direction) => DIRECTION_SEVERITY[direction] === severity
                      ).map((direction) => (
                        <span key={direction}>{DIRECTION_NAMES_AR[direction]}</span>
                      ))}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">
                    السرعة (كم/س)
                    <br />
                    <small>
                      {STRONG_WIND_GREEN_DIRECTIONS.map(
                        (direction) => DIRECTION_NAMES_AR[direction]
                      ).join(' / ')}
                    </small>
                  </th>
                  <td>
                    {SPEED_THRESHOLDS.greenMinKmh} إلى أقل من {SPEED_THRESHOLDS.severeMinKmh}
                  </td>
                  <td>—</td>
                  <td rowSpan={2}>
                    أقل من {SPEED_THRESHOLDS.greenMinKmh}، أو {SPEED_THRESHOLDS.severeMinKmh} فأكثر
                  </td>
                </tr>
                <tr>
                  <th scope="row">
                    السرعة (كم/س)
                    <br />
                    <small>بقية الاتجاهات</small>
                  </th>
                  <td>
                    {SPEED_THRESHOLDS.greenMinKmh} إلى أقل من {SPEED_THRESHOLDS.strongMinKmh}
                  </td>
                  <td>
                    {SPEED_THRESHOLDS.strongMinKmh} إلى أقل من {SPEED_THRESHOLDS.severeMinKmh}
                  </td>
                </tr>
                <tr>
                  <th scope="row">الرطوبة</th>
                  <td>أقل من {HUMIDITY_THRESHOLDS.greenMaxExclusive}%</td>
                  <td>
                    {HUMIDITY_THRESHOLDS.greenMaxExclusive}% إلى أقل من{' '}
                    {HUMIDITY_THRESHOLDS.redMinInclusive}%
                  </td>
                  <td>{HUMIDITY_THRESHOLDS.redMinInclusive}% فأكثر</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="legend__group">
            <h3>قراءة فترات اليوم</h3>
            <p className="legend__note">
              الشريط هو القراءة الأساسية لكل يوم. اختر ساعة لمعرفة قيمها وجميع أسباب حالتها. جدول
              «أرقام الفترات» داخل التفاصيل يعرض مدى سرعة الرياح ومتوسط الرطوبة وحدود كل فترة.
              الفترة ذات الحدود المتقطعة انقضت؛ متوسط الفترة لا يحدد لون ساعاتها.
            </p>
          </div>
          <div className="legend__group">
            <h3>حدود التقييم</h3>
            <p className="legend__note">
              هذا تقييم لتفضيلاتك، وليس حكمًا على سلامة الخروج. الحرارة والمطر والهبّات لا تدخل
              الحساب. الاتجاه هو الجهة التي تأتي منها الرياح. البيانات الناقصة تظهر بحالة محايدة، مع
              بيان الحقول غير المتاحة وأي أسباب معروفة.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
