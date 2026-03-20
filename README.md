# E2E Report Composer

設定ファイルに記載した Web アプリ URL に対して、Playwright で E2E テストを実行する構成です。

## 仕様に合わせたポイント

- 確認対象 URL は [e2e.settings.ts](e2e.settings.ts) に集約
- テストスクリプトは [tests/ATest.ts](tests/ATest.ts) と [tests/BTest.ts](tests/BTest.ts)
- 1 つのテストファイルに複数テストを書いても、同じレポートフォルダへ集約可能
- 操作内容と期待結果は各テストスクリプトの `steps` に記載
- 各テストで操作前・操作中・操作後のフルページスクリーンショットを保存
- テスト結果は `playwright-report/<テスト名>/index.html` と `playwright-report/<テスト名>/data/*.png` に出力
- Playwright の実行成果物も `playwright-report/.artifacts` に集約し、`test-results` は作成しない

## セットアップ

```powershell
npm install
npx playwright install
```

## URL 設定

[e2e.settings.ts](e2e.settings.ts) の `url` を確認対象の Web アプリに変更します。

```ts
export const appUnderTest = {
	url: 'https://example.com'
};
```

## 実行

```powershell
npm test
```

ヘッド付き実行:

```powershell
npm run test:headed
```

UI モード:

```powershell
npm run test:ui
```

## レポート出力

実行後は以下のように出力されます。

```text
playwright-report/
	.artifacts/
	ATest/
		data/
			任意のスクリーンショット名.png
		index.html
	BTest/
		data/
			任意のスクリーンショット名.png
		index.html
```

スクリーンショット名は各テストスクリプトの `screenshotNames` で変更できます。

同じファイル内で複数テストを 1 フォルダへまとめたい場合は、各テストで `id` を分けて `reportGroup` を同じ値にします。

```ts
createScenarioTest({
	id: 'ATest-basic-render',
	reportGroup: 'ATest',
	title: 'ATest: 初期表示を確認する',
	...
});

createScenarioTest({
	id: 'ATest-reload-check',
	reportGroup: 'ATest',
	title: 'ATest: 再読み込みを確認する',
	...
});
```

この場合、レポートは [playwright-report/ATest/index.html](playwright-report/ATest/index.html) にまとまり、各ケースのスクリーンショットは [playwright-report/ATest/data](playwright-report/ATest/data) に保存されます。

## テスト編集ポイント

- URL 設定: [e2e.settings.ts](e2e.settings.ts)
- A シナリオ: [tests/ATest.ts](tests/ATest.ts)
- B シナリオ: [tests/BTest.ts](tests/BTest.ts)
- レポート生成共通処理: [tests/support/scenario.ts](tests/support/scenario.ts)