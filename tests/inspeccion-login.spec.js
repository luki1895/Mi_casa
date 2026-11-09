
import { test, expect } from '@playwright/test';

test('Mi Casa - inspección de inicio de sesión', async ({ page }) => {
  const errores = [];

  page.on('pageerror', error => {
    errores.push(error.message);
  });

  const response = await page.goto('/login', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  await expect(page.locator('body')).toBeVisible();

  console.log('\n========== INSPECCIÓN LOGIN ==========');
  console.log('URL:', page.url());
  console.log('ESTADO HTTP:', response?.status());
  console.log('TÍTULO:', await page.title());

  console.log('\nENCABEZADOS:');
  console.log(await page.locator('h1, h2, h3').allTextContents());

  const campos = await page.locator('input:visible').evaluateAll(
    elementos => elementos.map(campo => ({
      tipo: campo.type,
      nombre: campo.name,
      placeholder: campo.placeholder,
      requerido: campo.required
    }))
  );

  console.log('\nCAMPOS VISIBLES:');
  console.log(campos);

  const botones = await page.locator('button:visible').allTextContents();
  console.log('\nBOTONES VISIBLES:');
  console.log(botones);

  const enlaces = await page.locator('a:visible').evaluateAll(
    elementos => elementos.map(enlace => ({
      texto: enlace.innerText.trim(),
      destino: enlace.href
    }))
  );

  console.log('\nENLACES:');
  console.log(enlaces);

  console.log('\nERRORES JAVASCRIPT:');
  console.log(errores);

  await page.screenshot({
    path: 'test-results/inspeccion-login.png',
    fullPage: true,
  });

  console.log('\n========== FIN INSPECCIÓN LOGIN ==========');
});
