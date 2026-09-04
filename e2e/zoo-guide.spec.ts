import { expect, test } from '@playwright/test';

test('loads the production app and switches grouped navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '台北動物園導覽', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '自然與野生動物', exact: true }).click();
  await expect(page.getByRole('button', { name: '河濱鳥類', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '河濱鳥類', exact: true }).click();
  await expect(page.getByRole('heading', { name: '河濱鳥類觀察', exact: true })).toBeVisible();
});

test('switches bilingual labels without mixed observation headers', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Nature & Wildlife', exact: true }).click();
  await page.getByRole('button', { name: 'Riverfront Birds', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Riverfront Bird Observations', exact: true })).toBeVisible();
  await expect(page.getByTestId('riverfront-bird-table').getByRole('columnheader', { name: 'Longitude', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '中文', exact: true }).click();
  await expect(page.getByTestId('riverfront-bird-table').getByRole('columnheader', { name: '經度', exact: true })).toBeVisible();
});

test('keeps biodiversity on the lightweight summary path until details are requested', async ({ page }) => {
  const dataRequests: string[] = [];
  page.on('request', (request) => dataRequests.push(request.url()));
  await page.goto('/');
  await page.getByRole('button', { name: '自然與野生動物', exact: true }).click();
  await page.getByRole('button', { name: '生物多樣性', exact: true }).click();
  await expect(page.getByRole('button', { name: '載入詳細紀錄', exact: true })).toBeVisible();
  await expect(page.locator('.biodiversity-table')).toHaveCount(0);
  expect(dataRequests.some((url) => url.endsWith('/data/taipei-biodiversity-species-survey-points.json'))).toBe(false);
});

test('filters riverfront observations and keeps their table usable on mobile', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: '自然與野生動物', exact: true }).click();
  await page.getByRole('button', { name: '河濱鳥類', exact: true }).click();
  await page.getByLabel('河域').selectOption({ label: '新店溪' });
  const birdTable = page.getByTestId('riverfront-bird-table');
  await expect(birdTable.getByRole('columnheader', { name: '經度', exact: true })).toBeVisible();
  await expect(birdTable.locator('tbody tr').first()).toContainText('新店溪');
  await expect(birdTable.locator('tbody tr').first().locator('td').nth(9)).toHaveText(/^121\.\d{4}$/);
  if (testInfo.project.name === 'mobile') {
    expect(await birdTable.locator('xpath=..').evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
  }
  await page.getByRole('button', { name: '河濱爬蟲', exact: true }).click();
  const reptileTable = page.getByTestId('riverfront-reptile-table');
  await expect(reptileTable.getByRole('columnheader', { name: '緯度', exact: true })).toBeVisible();
  await expect(reptileTable.locator('tbody tr').first().locator('td').nth(11)).toHaveText(/^121\.\d{4}$/);
});

test('shows separate riverfront totals and the comparison caveat in Overview', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '資料與說明', exact: true }).click();
  await expect(page.getByText('河濱爬蟲紀錄', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '河濱生態比較', exact: true })).toBeVisible();
  await expect(page.getByText(/不可據此比較族群大小、棲地品質或目前可觀察性/)).toBeVisible();
});

test('renders map controls, attribution, and a marker popup', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '規劃參觀', exact: true }).click();
  await expect(page.getByTestId('guide-map')).toBeVisible();
  await expect(page.getByLabel('生物多樣性調查點位')).toBeVisible();
  await expect(page.getByRole('link', { name: 'OpenStreetMap contributors' })).toBeVisible();
  await page.locator('.leaflet-marker-icon').first().click({ force: true });
  await expect(page.getByRole('button', { name: '查看詳細資料' }).first()).toBeVisible();
});

test('reloads through the active service worker without a blank app shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '台北動物園導覽', exact: true })).toBeVisible();
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(registration?.active && navigator.serviceWorker.controller);
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: '台北動物園導覽', exact: true })).toBeVisible();
});
