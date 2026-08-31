import assert from 'node:assert/strict';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(projectRoot, 'dist');

async function exists(relativePath) {
  await access(path.join(distDir, relativePath));
}

const indexHtml = await readFile(path.join(distDir, 'index.html'), 'utf8');
const manifest = JSON.parse(await readFile(path.join(distDir, 'manifest.webmanifest'), 'utf8'));
const serviceWorker = await readFile(path.join(distDir, 'sw.js'), 'utf8');

assert.match(indexHtml, /rel="manifest"/, 'صفحة الإنتاج لا تربط Manifest.');
assert.match(indexHtml, /registerSW\.js/, 'صفحة الإنتاج لا تسجل Service Worker.');
assert.match(indexHtml, /Content-Security-Policy/, 'سياسة CSP غير موجودة في صفحة الإنتاج.');
assert.match(
  indexHtml,
  /worker-src 'self';/,
  'سياسة عامل الإنتاج يجب أن تبقى محصورة في نفس الأصل.'
);
assert.doesNotMatch(indexHtml, /worker-src[^;"]*blob:/, 'سماح عامل HMR تسرّب إلى نسخة الإنتاج.');
assert.doesNotMatch(indexHtml, /\/src\/main\.tsx/, 'صفحة الإنتاج ما زالت تشير إلى مصدر التطوير.');

assert.equal(manifest.lang, 'ar');
assert.equal(manifest.dir, 'rtl');
assert.equal(manifest.display, 'standalone');
assert.equal(manifest.id, './');
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');

const requiredIcons = new Set(['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']);
for (const icon of manifest.icons ?? []) {
  requiredIcons.delete(icon.src);
  await exists(icon.src);
  assert.ok((await stat(path.join(distDir, icon.src))).size > 0, `الأيقونة ${icon.src} فارغة.`);
}
assert.deepEqual([...requiredIcons], [], `أيقونات PWA ناقصة: ${[...requiredIcons].join(', ')}`);

assert.match(serviceWorker, /precacheAndRoute/, 'Service Worker لا يسبق تحميل القشرة.');
assert.match(serviceWorker, /NavigationRoute/, 'Navigation fallback غير موجود.');
assert.match(serviceWorker, /index\.html/, 'index.html غير موجود في مسار الرجوع.');
assert.match(
  serviceWorker,
  /api\\?\.open-meteo\\?\.com/,
  'مسار Open-Meteo غير موجود في Service Worker.'
);
assert.match(serviceWorker, /NetworkOnly/, 'طلب Open-Meteo لا يستخدم NetworkOnly.');

const base = process.env.VITE_BASE_PATH ?? './';
const references = [...indexHtml.matchAll(/(?:src|href)="([^"#?]+)"/g)].map((match) => match[1]);
for (const reference of references) {
  if (/^(?:https?:|data:)/.test(reference)) continue;
  let relative = reference;
  if (relative.startsWith('./')) relative = relative.slice(2);
  else if (base !== './' && relative.startsWith(base)) relative = relative.slice(base.length);
  else if (relative.startsWith('/')) relative = relative.slice(1);
  await exists(relative);
}

const outputFiles = await readdir(distDir, { recursive: true });
assert.equal(
  outputFiles.some((file) => file.endsWith('.map')),
  false,
  'نسخة الإنتاج تحتوي Source Maps غير مطلوبة.'
);

console.log(`PWA verified: ${outputFiles.length} files, ${references.length} entry references.`);
