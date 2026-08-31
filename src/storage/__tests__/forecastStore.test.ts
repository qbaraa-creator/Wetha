// @vitest-environment jsdom
/// <reference types="vitest/jsdom" />

import { IDBDatabase, IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { LOCATION, STORAGE_SCHEMA_VERSION } from '../../config/appConfig';
import { makeTestForecast } from '../../test/forecast';
import { loadForecast, saveForecast, type StoredForecast } from '../forecastStore';

const DB_NAME = 'jeddah-wind-humidity';
const STORE_NAME = 'forecast';
const LOCAL_KEY = 'jeddah-wind-humidity:forecast';

function storedForecast(): StoredForecast {
  const forecast = makeTestForecast();
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    locationId: forecast.locationId,
    fetchedAtIso: forecast.fetchedAtIso,
    forecast
  };
}

/** تهيئة سجل حقيقي في تنفيذ IndexedDB داخل الذاكرة، لا محاكاة نتيجة loadForecast. */
async function seedIndexedDb(value: unknown, version = 1): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, version);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(value, 'latest');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

describe('تخزين التوقع ومسارات السقوط الآمن', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    // Node الحديث يملك localStorage تجريبيًا؛ نختبر تخزين jsdom الخاص بالمتصفح.
    vi.stubGlobal('localStorage', jsdom.window.localStorage);
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('ينشئ IndexedDB ويحفظ ثم يستعيد السجل دون لمس localStorage', async () => {
    const record = storedForecast();
    const setLocal = vi.spyOn(Storage.prototype, 'setItem');
    const getLocal = vi.spyOn(Storage.prototype, 'getItem');
    await saveForecast(record.forecast);
    expect(await loadForecast(LOCATION.id)).toEqual(record);
    expect(setLocal).not.toHaveBeenCalled();
    expect(getLocal).not.toHaveBeenCalled();
  });

  it('يعيد null عند خلو المخزنين', async () => {
    expect(await loadForecast(LOCATION.id)).toBeNull();
  });

  it('يرفض تصنيفات الإصدار 3 القديمة في المخزنين ويقبل البيانات المعاد حسابها', async () => {
    const stale = { ...storedForecast(), schemaVersion: 3 };
    await seedIndexedDb(stale);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(stale));
    expect(await loadForecast(LOCATION.id)).toBeNull();
    const fresh = storedForecast();
    await saveForecast(fresh.forecast);
    expect(await loadForecast(LOCATION.id)).toEqual(fresh);
  });

  it('لا يستبدل السجل الناجح بتوقع بلا أيام', async () => {
    const record = storedForecast();
    await saveForecast(record.forecast);
    await saveForecast({ ...record.forecast, days: [] });
    expect(await loadForecast(LOCATION.id)).toEqual(record);
  });

  it('يسقط إلى localStorage للكتابة والقراءة عند غياب IndexedDB', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const record = storedForecast();
    await saveForecast(record.forecast);
    expect(JSON.parse(localStorage.getItem(LOCAL_KEY)!)).toEqual(record);
    expect(await loadForecast(LOCATION.id)).toEqual(record);
  });

  it('يسقط عند خطأ فتح IndexedDB غير المتزامن (VersionError)', async () => {
    const record = storedForecast();
    await seedIndexedDb(record, 2);
    await saveForecast(record.forecast);
    expect(JSON.parse(localStorage.getItem(LOCAL_KEY)!)).toEqual(record);
    expect(await loadForecast(LOCATION.id)).toEqual(record);
  });

  it('يستعيد localStorage إن كان سجل IndexedDB تالفًا', async () => {
    const record = storedForecast();
    await seedIndexedDb({ ...record, forecast: { days: [{}] } });
    localStorage.setItem(LOCAL_KEY, JSON.stringify(record));
    expect(await loadForecast(LOCATION.id)).toEqual(record);
  });

  it.each([
    [999, 31],
    [20, 35]
  ])('يرفض الحرارة التالفة من كلا المخزنين: %s / %s', async (max, min) => {
    const valid = storedForecast();
    const corrupt = storedForecast();
    corrupt.forecast.days[0].temperatureMaxC = max;
    corrupt.forecast.days[0].temperatureMinC = min;
    await seedIndexedDb(corrupt);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(valid));
    expect(await loadForecast(LOCATION.id)).toEqual(valid);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(corrupt));
    expect(await loadForecast(LOCATION.id)).toBeNull();
  });

  it('يستعيد localStorage إن لم يوجد السجل في IndexedDB', async () => {
    const record = storedForecast();
    localStorage.setItem(LOCAL_KEY, JSON.stringify(record));
    expect(await loadForecast(LOCATION.id)).toEqual(record);
  });

  it.each(['{broken json', JSON.stringify({ days: [{}] })])(
    'يرفض localStorage التالف: %s',
    async (raw) => {
      vi.stubGlobal('indexedDB', undefined);
      localStorage.setItem(LOCAL_KEY, raw);
      expect(await loadForecast(LOCATION.id)).toBeNull();
    }
  );

  it('يرفض سجل موقع آخر من المخزنين', async () => {
    const record = storedForecast();
    await seedIndexedDb(record);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(record));
    expect(await loadForecast('another-location')).toBeNull();
  });

  it('يبقى آمنًا إذا كان المخزنان محظورين', async () => {
    vi.stubGlobal('indexedDB', undefined);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('storage blocked', 'SecurityError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('storage blocked', 'SecurityError');
    });
    await expect(saveForecast(makeTestForecast())).resolves.toBeUndefined();
    await expect(loadForecast(LOCATION.id)).resolves.toBeNull();
  });

  it('يغلق اتصال قاعدة البيانات ويسقط عند فشل put المتزامن', async () => {
    const close = vi.spyOn(IDBDatabase.prototype, 'close');
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    await saveForecast(makeTestForecast());
    expect(close).toHaveBeenCalledOnce();
    expect(localStorage.getItem(LOCAL_KEY)).not.toBeNull();
  });

  it('يسقط عند إلغاء معاملة الكتابة حتى بعد نجاح طلب put', async () => {
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      value,
      key
    ) {
      const request = put.call(this, value, key);
      request.addEventListener('success', () => this.transaction.abort());
      return request;
    });
    await saveForecast(makeTestForecast());
    expect(localStorage.getItem(LOCAL_KEY)).not.toBeNull();
  });

  it('يسقط عند خطأ طلب الكتابة داخل المعاملة', async () => {
    const put = IDBObjectStore.prototype.put;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (
      this: IDBObjectStore,
      value,
      key
    ) {
      const request = put.call(this, value, key);
      this.transaction.abort();
      return request;
    });
    await saveForecast(makeTestForecast());
    expect(localStorage.getItem(LOCAL_KEY)).not.toBeNull();
  });

  it('يسقط عند خطأ طلب القراءة ويغلق الاتصال', async () => {
    const record = storedForecast();
    await seedIndexedDb(record);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(record));
    const close = vi.spyOn(IDBDatabase.prototype, 'close');
    const get = IDBObjectStore.prototype.get;
    vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(function (
      this: IDBObjectStore,
      key
    ) {
      const request = get.call(this, key);
      this.transaction.abort();
      return request;
    });
    expect(await loadForecast(LOCATION.id)).toEqual(record);
    expect(close).toHaveBeenCalledOnce();
  });
});
