export const appUnderTest = {
  url: 'https://example.com',
  waitUntil: 'domcontentloaded' as const,
  navigationTimeoutMs: 30_000,
  viewport: {
    width: 1440,
    height: 900
  }
};