import { STORAGE_SCHEMA_VERSION } from '../config/appConfig';
import { parseStoredForecast, type StoredForecast } from './forecastSchema';
import type { NormalizedForecast } from '../domain/types';

/**
 * القسم 15.2 — حفظ آخر نموذج داخلي ناجح مع وقت الجلب والموقع وإصدار المخطط.
 * IndexedDB أولًا، مع سقوط آمن إلى localStorage عند تعذّرها (وضع خاص أو متصفح مقيّد).
 */

const DB_NAME = 'jeddah-wind-humidity';
const STORE_NAME = 'forecast';
const RECORD_KEY = 'latest';
const LOCAL_STORAGE_KEY = 'jeddah-wind-humidity:forecast';

export type { StoredForecast };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB غير متاح.'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('تعذّر فتح قاعدة البيانات المحلية.'));
  });
}

async function idbSet(record: StoredForecast): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error ?? new Error('أُلغي حفظ التوقع.'));
      transaction.objectStore(STORE_NAME).put(record, RECORD_KEY);
    });
  } finally {
    db.close();
  }
}

async function idbGet(): Promise<unknown> {
  const db = await openDatabase();
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      transaction.onabort = () => reject(transaction.error ?? new Error('أُلغيت قراءة التوقع.'));
      const request = transaction.objectStore(STORE_NAME).get(RECORD_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** لا تُستبدل البيانات الصحيحة باستجابة ناقصة أو تالفة (القسم 15.2). */
export async function saveForecast(forecast: NormalizedForecast): Promise<void> {
  if (!forecast.days.length) return;

  const record: StoredForecast = {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    locationId: forecast.locationId,
    fetchedAtIso: forecast.fetchedAtIso,
    forecast
  };

  try {
    await idbSet(record);
    return;
  } catch {
    // يسقط إلى localStorage أدناه.
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // التخزين غير متاح؛ التطبيق يبقى عاملًا بلا حفظ.
  }
}

/**
 * كل ما يخرج من التخزين يمر على المدقق العميق قبل استعماله.
 * سجل مرفوض من IndexedDB لا يمنع تجربة localStorage: قد يكون أحدهما تالفًا وحده.
 */
export async function loadForecast(locationId: string): Promise<StoredForecast | null> {
  try {
    const record = parseStoredForecast(await idbGet(), locationId);
    if (record) return record;
  } catch {
    // يُجرَّب localStorage.
  }

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return parseStoredForecast(JSON.parse(raw), locationId);
  } catch {
    return null;
  }
}
