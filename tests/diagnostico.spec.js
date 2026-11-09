import { test, expect } from '@playwright/test';

test('Diagnóstico de Chromium', async ({ page }) => {
  await page.goto('https://example.com', {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });

  await expect(page).toHaveTitle('Example Domain');

  console.log('DIAGNÓSTICO: Chromium funciona dentro de Playwright Test');
});
