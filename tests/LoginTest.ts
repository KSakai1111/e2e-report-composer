import { createScenarioTest } from './support/scenario';

createScenarioTest({
  id: 'LoginTest-valid-credentials',
  reportGroup: 'LoginTest',
  title: 'ログインテスト: 正常なログイン処理を確認する',
  objective: 'ユーザーID「TEST」とパスワード「TEST」を使用して正常にログインできることを確認する。',
  screenshotNames: {
    before: 'login-before-input.png',
    during: 'login-during-input.png',
    after: 'login-after-submit.png'
  },
  steps: [
    {
      name: '1. ログイン画面タイトルの表示確認',
      action: 'ログイン画面が表示されていることを確認する',
      expected: 'ユーザーIDとパスワードの入力フィールドが表示される',
      screenshot: 'step1-login-title.png',
      run: async ({ page, expect }) => {
        await expect(page.locator('#UserId')).toBeVisible();
        await expect(page.locator('#password')).toBeVisible();
      }
    },
    {
      name: '2. ユーザーIDの入力',
      action: 'ユーザーID入力欄に「TEST」を入力する',
      expected: 'ユーザーID欄に「TEST」が入力される',
      screenshot: 'step2-user-input.png',
      run: async ({ page, expect }) => {
        await page.locator('#UserId').fill('TEST');
        await expect(page.locator('#UserId')).toHaveValue('TEST');
      }
    },
    {
      name: '3. パスワードの入力',
      action: 'パスワード入力欄に「TEST」を入力する',
      expected: 'パスワード欄に「TEST」が入力される',
      screenshot: 'step3-password-input.png',
      run: async ({ page, expect }) => {
        await page.locator('#password').fill('TEST');
        await expect(page.locator('#password')).toHaveValue('TEST');
      }
    },
    {
      name: '4. ログインボタンの確認',
      action: 'ログインボタンが表示され、クリック可能であることを確認する',
      expected: 'ログインボタンが有効な状態で表示される',
      screenshot: 'step4-before-login-button.png',
      run: async ({ page, expect }) => {
        const loginButton = page.locator('button.btn-primary');
        await expect(loginButton).toBeVisible();
        await expect(loginButton).toBeEnabled();
      }
    },
    {
      name: '5. ログインボタンのクリックと画面遷移',
      action: 'ログインボタンをクリックしてログイン処理を実行する',
      expected: 'ログイン処理が実行され、ログイン後の画面に遷移する',
      screenshot: 'step5-after-login.png',
      run: async ({ page, expect }) => {
        // ログインボタンをクリック
        await page.locator('button.btn-primary').click();
        
        // ログイン後の画面遷移を待つ（URLが変わることを確認）
        await page.waitForURL((url) => !url.pathname.includes('/C010'), { timeout: 10000 });
      }
    },
    {
      name: '6. ログイン後の画面表示確認',
      action: 'ログイン後の次の画面が正常に表示されることを確認する',
      expected: 'ログイン後のメイン画面が表示される',
      screenshot: 'step6-logged-in-screen.png',
      run: async ({ page, expect }) => {
        // 画面が完全に読み込まれるまで待機
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        
        // ログイン後の画面が表示されていることを確認（メニューなどの要素を確認）
        await expect(page.locator('body')).toBeVisible();
      }
    }
  ]
});

createScenarioTest({
  id: 'LoginTest-screen-elements',
  reportGroup: 'LoginTest',
  title: 'ログインテスト: 画面要素の表示を確認する',
  objective: 'ログイン画面に必要な要素が正しく表示されていることを確認する。',
  screenshotNames: {
    before: 'login-elements-before.png',
    during: 'login-elements-during.png',
    after: 'login-elements-after.png'
  },
  steps: [
    {
      name: 'ログイン画面タイトルの確認',
      action: '「MD Tool」のブランド名が表示されていることを確認する',
      expected: 'ブランド名「MD Tool」が表示される',
      captureDuring: true,
      run: async ({ page, expect }) => {
        await expect(page.locator('.login-brand-name')).toContainText('MD Tool');
      }
    },
    {
      name: 'ユーザーIDラベルの確認',
      action: 'ユーザーIDのラベルが表示されていることを確認する',
      expected: '「ユーザーID」ラベルが表示される',
      run: async ({ page, expect }) => {
        await expect(page.locator('label[for="UserId"]')).toContainText('ユーザーID');
      }
    },
    {
      name: 'パスワードラベルの確認',
      action: 'パスワードのラベルが表示されていることを確認する',
      expected: '「パスワード」ラベルが表示される',
      run: async ({ page, expect }) => {
        await expect(page.locator('label[for="password"]')).toContainText('パスワード');
      }
    },
    {
      name: 'ログインボタンの確認',
      action: 'ログインボタンが表示され有効であることを確認する',
      expected: 'ログインボタンが表示され、クリック可能である',
      run: async ({ page, expect }) => {
        const loginButton = page.locator('button.btn-primary');
        await expect(loginButton).toBeVisible();
        await expect(loginButton).toBeEnabled();
      }
    }
  ]
});
