import { createScenarioTest } from './support/scenario';

createScenarioTest({
  id: 'BTest',
  title: 'BTest: スクロールと再読み込み後の表示を確認する',
  objective: 'ページ操作中と操作後の状態を確認し、表示が継続することを検証する。',
  screenshotNames: {
    before: 'b-before-open.png',
    during: 'b-during-scroll.png',
    after: 'b-after-reload.png'
  },
  steps: [
    {
      name: 'スクロール操作',
      action: 'ページを縦方向にスクロールする',
      expected: 'スクロール後も body 要素が表示される',
      captureDuring: true,
      run: async ({ page, expect }) => {
        await page.evaluate(() => {
          window.scrollTo({ top: Math.floor(window.innerHeight / 2), behavior: 'auto' });
        });
        await expect(page.locator('body')).toBeVisible();
      }
    },
    {
      name: '再読み込み後の確認',
      action: 'ページを再読み込みする',
      expected: '再読み込み後も本文とタイトルが取得できる',
      run: async ({ page, expect }) => {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
        await expect.poll(async () => (await page.title()).trim().length).toBeGreaterThan(0);
      }
    }
  ]
});