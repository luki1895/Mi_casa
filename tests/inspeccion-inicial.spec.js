
import { test, expect } from '@playwright/test';

test('Mi Casa - inspección visual y de elementos', async ({ page }) => {
  await page.goto('/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  await expect(page.locator('body')).toBeVisible();

  console.log('\n========== INSPECCIÓN DE MI CASA ==========');

  console.log('URL:', page.url());
  console.log('TÍTULO:', await page.title());

  const encabezados = await page.locator('h1, h2, h3').allTextContents();
  console.log('\nENCABEZADOS:');
  console.log(encabezados);

  const botones = await page.locator('button:visible').allTextContents();
  console.log('\nBOTONES VISIBLES:');
  console.log(botones);

  const enlaces = await page.locator('a:visible').allTextContents();
  console.log('\nENLACES VISIBLES:');
  console.log(enlaces);

  const enlacesDetallados = await page.locator('a:visible').evaluateAll(
  elementos => elementos.map(enlace => ({
    texto: enlace.innerText.trim(),
    destino: enlace.href
  }))
);

console.log('\nDESTINOS DE LOS ENLACES:');
console.log(enlacesDetallados);

const botonesDetallados = await page.locator('button:visible').evaluateAll(
  elementos => elementos.map(boton => ({
    texto: boton.innerText.trim(),
    tipo: boton.type,
    deshabilitado: boton.disabled
  }))
);

console.log('\nDETALLE DE LOS BOTONES:');
console.log(botonesDetallados);

  await page.screenshot({
    path: 'test-results/inspeccion-mi-casa.png',
    fullPage: true,
  });

  console.log('\n========== FIN DE INSPECCIÓN ==========');
});
