import { readFileSync } from 'node:fs';

const stylesheet = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const colors = new Map(
  [...stylesheet.matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map((match) => [match[1], match[2]])
);

function luminance(token: string): number {
  const color = colors.get(token);
  if (!color) throw new Error(`رمز اللون غير موجود: ${token}`);
  return [1, 3, 5]
    .map((offset) => parseInt(color.slice(offset, offset + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4))
    .reduce((total, channel, index) => total + channel * [0.2126, 0.7152, 0.0722][index], 0);
}

describe.each(['green-base', 'orange-base', 'red-base', 'ink-muted'])('تباين النص %s', (text) => {
  it.each(['card', 'card-soft', 'page', 'orange-surface'])('يعبر AA على %s', (surface) => {
    const [lighter, darker] = [luminance(text), luminance(surface)].sort((a, b) => b - a);
    expect((lighter + 0.05) / (darker + 0.05)).toBeGreaterThanOrEqual(4.5);
  });
});
