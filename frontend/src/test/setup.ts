import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Run cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock EventSource since it's not available in jsdom
const MockEventSource = vi.fn().mockImplementation(function(this: any, url: string) {
  this.url = url;
  this.onopen = null;
  this.onmessage = null;
  this.onerror = null;
  this.close = vi.fn();
});

vi.stubGlobal('EventSource', MockEventSource);
