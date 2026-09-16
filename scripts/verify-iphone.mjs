import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const out = 'screenshots';
fs.mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu']
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.setUserAgent(
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
);

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle0' });
await page.screenshot({ path: `${out}/welcome.png` });

await page.click('[data-demo-start]');
await page.waitForSelector('.hero-money');
await page.screenshot({ path: `${out}/home.png` });

const before = await page.$eval('.dollars', (el) => el.textContent);

await page.click('[data-open="log"]');
await page.waitForSelector('[data-save-trip]');
await page.click('[data-plat="panda"]');
await page.$eval('#fare', (el) => {
  el.value = '11.25';
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.$eval('#tip', (el) => {
  el.value = '2.50';
});
await page.$eval('#miles', (el) => {
  el.value = '3.1';
});
await page.$eval('#minutes', (el) => {
  el.value = '14';
});
await page.screenshot({ path: `${out}/log.png` });
await page.click('[data-save-trip]');
await page.waitForSelector('.hero-money');
const after = await page.$eval('.dollars', (el) => el.textContent);
if (after === before) throw new Error(`trip did not change today total (${before})`);

await page.click('[data-tab="stats"]');
await page.waitForSelector('.bars');
await page.screenshot({ path: `${out}/stats.png` });

await page.click('[data-tab="apps"]');
await page.waitForSelector('[data-open-app="panda"]');
await page.click('[data-toggle="panda"]');
await page.screenshot({ path: `${out}/apps.png` });

await page.click('[data-tab="more"]');
await page.waitForSelector('[data-save-profile]');
await page.screenshot({ path: `${out}/more.png` });

const health = await page.evaluate(async () => {
  const r = await fetch('/api/health');
  return r.json();
});
if (!health.ok) throw new Error('health failed');

console.log(JSON.stringify({ before, after, health, ok: true }, null, 2));
await browser.close();
