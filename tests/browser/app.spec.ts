import { test, expect } from '@playwright/test';

function syntheticTone() {
  const samples = 11025;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVE', 8);
  buffer.write('fmt ', 12); buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(22050, 24); buffer.writeUInt32LE(44100, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 440 / 22050) * 2000), 44 + i * 2);
  return buffer;
}

async function resetScreenshotScroll(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.querySelectorAll('*').forEach(element => { if (element.scrollHeight > element.clientHeight) element.scrollTop = 0; });
  });
}

test('demo, language, quick phrases, clear, and responsive screenshots', async ({ page }, testInfo) => {
  const paidRequests: string[] = [];
  page.on('request', request => { if (/elevenlabs|anthropic|\/v1\//.test(request.url())) paidRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.getByText('Voice for Speechless', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Speak', exact: true })).toBeDisabled();
  const message = page.getByRole('textbox', { name: 'Your message', exact: true });
  await message.fill('Thank you for being here.');
  await expect(page.getByRole('button', { name: 'Speak', exact: true })).toBeEnabled();
  await resetScreenshotScroll(page);
  await page.screenshot({ path: `docs/images/${testInfo.project.name}-demo.png`, fullPage: true });
  await page.getByRole('button', { name: 'Clear message' }).click();
  await expect(message).toHaveValue('');
  await expect(message).toBeFocused();
  await page.getByRole('button', { name: 'Български', exact: true }).click();
  await expect(page.getByText('Какво искате да кажете?')).toBeVisible();
  await page.getByRole('textbox', { name: 'Вашето съобщение', exact: true }).fill('Благодаря, че сте тук.');
  await resetScreenshotScroll(page);
  await page.screenshot({ path: `docs/images/${testInfo.project.name}-bulgarian.png`, fullPage: true });
  await page.getByRole('button', { name: 'Искам вода', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Вашето съобщение', exact: true })).toHaveValue('Искам вода');
  // System voices may be absent in headless Chromium. Never fake successful sound.
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Voice settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Personal voice', exact: true })).toBeVisible();
  await page.waitForTimeout(350); // Let the native-style modal fade finish before capture.
  await page.screenshot({ path: `docs/images/${testInfo.project.name}-settings.png`, fullPage: true });
  await page.getByRole('button', { name: 'Close settings' }).click();
  expect(paidRequests).toEqual([]);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test('connected mode is explicit, predictions opt in, and browser token does not persist', async ({ page }) => {
  const calls: { route: string; body: unknown }[] = [];
  await page.route('https://speech.example/**', async route => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } }); return; }
    calls.push({ route: route.request().url(), body: route.request().postDataJSON() });
    if (route.request().url().endsWith('/predictions')) await route.fulfill({ json: { words: ['water'] }, headers: { 'access-control-allow-origin': '*' } });
    else await route.fulfill({ status: 401, json: { error: 'unauthorized' }, headers: { 'access-control-allow-origin': '*' } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Voice settings', exact: true }).click();
  await page.getByRole('button', { name: 'Personal voice', exact: true }).click();
  await page.getByRole('textbox', { name: 'Backend URL', exact: true }).fill('https://speech.example');
  await page.getByRole('textbox', { name: 'Installation credential', exact: true }).fill('a'.repeat(64));
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  await expect(page.getByText('Connection saved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();
  const input = page.getByRole('textbox', { name: 'Your message', exact: true });
  await input.fill('I need');
  await page.waitForTimeout(550);
  expect(calls).toHaveLength(0);
  await page.getByRole('button', { name: 'Speak', exact: true }).click();
  await expect(page.getByText('Connection authorization failed. Update your installation credential.')).toBeVisible();
  await page.getByRole('button', { name: 'Voice settings', exact: true }).click();
  await page.getByRole('switch', { name: 'Word suggestions', exact: true }).check();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.getByText('Next words', { exact: true })).toBeVisible();
  expect(calls.some(call => call.route.endsWith('/predictions'))).toBe(true);
  await page.getByRole('button', { name: 'water', exact: true }).click();
  await expect(input).toHaveValue('I need water ');
  await page.getByRole('button', { name: 'Clear message' }).click();
  await expect(page.getByText('Next words', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Demo voice', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Voice settings', exact: true }).click();
  await page.getByRole('button', { name: 'Personal voice', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Installation credential', exact: true })).toHaveValue('');
});

test('mock connected audio decodes, stops, and releases Blob URLs', async ({ page }) => {
  await page.addInitScript(() => {
    const state = { created: 0, revoked: 0 };
    (window as any).__audioCacheTest = state;
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => { state.created++; return create(blob); };
    URL.revokeObjectURL = url => { state.revoked++; revoke(url); };
  });
  let calls = 0;
  await page.route('https://speech.example/**', async route => {
    if (route.request().method() === 'OPTIONS') { await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } }); return; }
    calls++;
    await route.fulfill({ body: syntheticTone(), contentType: 'audio/wav', headers: { 'access-control-allow-origin': '*' } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Voice settings', exact: true }).click();
  await page.getByRole('button', { name: 'Personal voice', exact: true }).click();
  await page.getByRole('textbox', { name: 'Backend URL', exact: true }).fill('https://speech.example');
  await page.getByRole('textbox', { name: 'Installation credential', exact: true }).fill('a'.repeat(64));
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  await expect(page.getByText('Connection saved', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('textbox', { name: 'Your message', exact: true }).fill('Synthetic playback test');
  await page.getByRole('button', { name: 'Speak', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__audioCacheTest.created)).toBe(1);
  await expect(page.getByRole('button', { name: 'Speak', exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__audioCacheTest.revoked)).toBe(1);
  await page.getByRole('button', { name: 'Speak', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__audioCacheTest.created)).toBe(2);
  const stop = page.getByRole('button', { name: 'Stop', exact: true });
  if (await stop.isVisible()) await stop.click();
  await expect.poll(() => page.evaluate(() => (window as any).__audioCacheTest.revoked)).toBe(2);
  expect(calls).toBe(2);
});
