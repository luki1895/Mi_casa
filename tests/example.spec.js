import { test, expect } from '@playwright/test';

test('Mi Casa - la aplicación responde correctamente', async ({ page }) => {
  const response = await page.goto('/', {
    waitUntil: 'domcontentloaded',
    timeout: 20000,
  });

  expect(response).not.toBeNull();
  expect(response.status()).toBeLessThan(400);

  await expect(page.locator('body')).toBeVisible();

  await page.screenshot({
    path: 'test-results/mi-casa-inicial.png',
    fullPage: true,
  });
});
