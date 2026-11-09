
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Configuración general
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,

  // Tiempo máximo de cada prueba
  timeout: 120000,

  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],

  use: {
    baseURL: 'https://mi-casa-gilt.vercel.app',

    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',

    // Desactivamos temporalmente el video
    video: 'off',

    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
