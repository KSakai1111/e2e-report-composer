import { createScenarioTest } from './support/scenario';

createScenarioTest({
  id: 'ATest-basic-render',
  reportGroup: 'ATest',
  title: 'ATest: 初期表示と基本描画を確認する',
  objective: '対象 URL を開き、画面の基本描画が成立していることを確認する。',
  screenshotNames: {
    before: 'a-basic-before-open.png',
    during: 'a-basic-during-render-check.png',
    after: 'a-basic-after-render-check.png'
  },
  steps: [
    {
      name: '本文の表示確認',
      action: 'ページ表示後に body 要素が見えていることを確認する',
      expected: 'body 要素が表示される',
      captureDuring: true,
      run: async ({ page, expect }) => {
        await expect(page.locator('body')).toBeVisible();
      }
    },
    {
      name: 'タイトルの確認',
      action: 'ページタイトルを取得する',
      expected: 'ページタイトルが空文字ではない',
      run: async ({ page, expect }) => {
        await expect.poll(async () => (await page.title()).trim().length).toBeGreaterThan(0);
      }
    }
  ]
});

createScenarioTest({
  id: 'ATest-reload-check',
  reportGroup: 'ATest',
  title: 'ATest: 再読み込み後の表示を確認する',
  objective: '同じ画面で再読み込み後も基本表示が維持されることを確認する。',
  screenshotNames: {
    before: 'a-reload-before-open.png',
    during: 'a-reload-during-reload.png',
    after: 'a-reload-after-check.png'
  },
  steps: [
    {
      name: '再読み込みを実行する',
      action: 'ページを再読み込みする',
      expected: '再読み込み後も body 要素が表示される',
      captureDuring: true,
      run: async ({ page, expect }) => {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
      }
    },
    {
      name: 'タイトルが維持されることを確認する',
      action: '再読み込み後のタイトル文字数を確認する',
      expected: 'ページタイトルが空文字ではない',
      run: async ({ page, expect }) => {
        await expect.poll(async () => (await page.title()).trim().length).toBeGreaterThan(0);
      }
    }
  ]
});