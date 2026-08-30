import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: vi.fn()
  });

  // jsdom لا يطبق Pointer Capture؛ هذه الدوال تكمل عقد المتصفح فقط حتى نختبر
  // منطق السحب نفسه من دون تغيير كود المنتج.
  Object.defineProperties(HTMLElement.prototype, {
    setPointerCapture: {
      configurable: true,
      value: vi.fn()
    },
    releasePointerCapture: {
      configurable: true,
      value: vi.fn()
    },
    hasPointerCapture: {
      configurable: true,
      value: vi.fn(() => false)
    }
  });
}
