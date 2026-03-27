import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { appUnderTest } from '../../e2e.settings';

type ScreenshotPhase = 'before' | 'during' | 'after';
type StepStatus = 'passed' | 'failed' | 'not-run';

type ScenarioContext = {
  page: Page;
  expect: typeof expect;
  testInfo: TestInfo;
};

export type ScenarioStep = {
  name: string;
  action: string;
  expected: string;
  captureDuring?: boolean;
  screenshot?: string; // ステップ実行後に取得するスクリーンショットのファイル名
  run: (context: ScenarioContext) => Promise<void>;
};

export type ScenarioDefinition = {
  id: string;
  reportGroup?: string;
  title: string;
  objective: string;
  screenshotNames: Record<ScreenshotPhase, string>;
  steps: [ScenarioStep, ...ScenarioStep[]];
};

type StepResult = {
  name: string;
  action: string;
  expected: string;
  status: StepStatus;
  errorMessage?: string;
  screenshot?: ScreenshotResult; // ステップごとのスクリーンショット
};

type ScreenshotResult = {
  label: string;
  fileName: string;
  relativePath: string;
};

type ScenarioReportContext = {
  reportGroup: string;
  reportGroupDir: string;
  dataDir: string;
  screenshots: Partial<Record<ScreenshotPhase, ScreenshotResult>>;
};

type StoredScenarioReport = {
  id: string;
  title: string;
  objective: string;
  targetUrl: string;
  finalUrl: string;
  status: 'passed' | 'failed';
  failureMessage?: string;
  steps: StepResult[];
  screenshots: Partial<Record<ScreenshotPhase, ScreenshotResult>>;
};

type StoredGroupReport = {
  reportGroup: string;
  scenarios: StoredScenarioReport[];
};

export function createScenarioTest(definition: ScenarioDefinition): void {
  test(definition.title, async ({ page }, testInfo) => {
    const reportContext = await createReportContext(definition);
    const stepResults: StepResult[] = definition.steps.map((step) => ({
      name: step.name,
      action: step.action,
      expected: step.expected,
      status: 'not-run'
    }));
    let failureMessage: string | undefined;

    try {
      page.setDefaultNavigationTimeout(appUnderTest.navigationTimeoutMs);
      await page.goto(appUnderTest.url, { waitUntil: appUnderTest.waitUntil });
      await expect(page.locator('body')).toBeVisible();


      for (const [index, step] of definition.steps.entries()) {
        await runStep({
          step,
          index,
          page,
          testInfo,
          reportContext,
          stepResults,
          duringFileName: definition.screenshotNames.during
        });
      }

    } catch (error) {
      failureMessage = toErrorMessage(error);
      throw error;
    } finally {

      await writeScenarioReport({
        definition,
        reportContext,
        stepResults,
        targetUrl: appUnderTest.url,
        finalUrl: page.url(),
        failureMessage
      });
    }
  });
}

async function runStep(args: {
  step: ScenarioStep;
  index: number;
  page: Page;
  testInfo: TestInfo;
  reportContext: ScenarioReportContext;
  stepResults: StepResult[];
  duringFileName: string;
}): Promise<void> {
  const { step, index, page, testInfo, reportContext, stepResults, duringFileName } = args;

  try {
    await test.step(`${index + 1}. ${step.name}`, async () => {
      await step.run({ page, expect, testInfo });
    });

    stepResults[index].status = 'passed';

    // ステップごとのスクリーンショットを取得
    if (step.screenshot) {
      const filePath = path.join(reportContext.dataDir, step.screenshot);
      await page.screenshot({
        path: filePath,
        fullPage: true
      });
      
      stepResults[index].screenshot = {
        label: `Step ${index + 1}: ${step.name}`,
        fileName: step.screenshot,
        relativePath: `data/${step.screenshot}`
      };
    }

  } catch (error) {
    stepResults[index].status = 'failed';
    stepResults[index].errorMessage = toErrorMessage(error);
    
    // エラー時もスクリーンショットを取得（可能であれば）
    if (step.screenshot && !page.isClosed()) {
      try {
        const filePath = path.join(reportContext.dataDir, step.screenshot);
        await page.screenshot({
          path: filePath,
          fullPage: true
        });
        
        stepResults[index].screenshot = {
          label: `Step ${index + 1}: ${step.name} (失敗時)`,
          fileName: step.screenshot,
          relativePath: `data/${step.screenshot}`
        };
      } catch {
        // スクリーンショット取得失敗時は無視
      }
    }
    
    throw error;
  }
}

async function createReportContext(definition: ScenarioDefinition): Promise<ScenarioReportContext> {
  const reportGroup = definition.reportGroup ?? definition.id;
  const reportGroupDir = path.join(process.cwd(), 'playwright-report', reportGroup);
  const dataDir = path.join(reportGroupDir, 'data');

  await mkdir(dataDir, { recursive: true });
  await cleanupScenarioFiles(definition, dataDir);

  return {
    reportGroup,
    reportGroupDir,
    dataDir,
    screenshots: {}
  };
}

async function captureScreenshot(args: {
  page: Page;
  reportContext: ScenarioReportContext;
  phase: ScreenshotPhase;
  label: string;
  fileName: string;
}): Promise<void> {
  const { page, reportContext, phase, label, fileName } = args;
  const filePath = path.join(reportContext.dataDir, fileName);

  await page.screenshot({
    path: filePath,
    fullPage: true
  });

  reportContext.screenshots[phase] = {
    label,
    fileName,
    relativePath: `data/${fileName}`
  };
}

async function captureScreenshotSafely(args: {
  page: Page;
  reportContext: ScenarioReportContext;
  phase: ScreenshotPhase;
  label: string;
  fileName: string;
}): Promise<void> {
  const { page, reportContext, phase } = args;

  if (reportContext.screenshots[phase] || page.isClosed()) {
    return;
  }

  try {
    await captureScreenshot(args);
  } catch {
    reportContext.screenshots[phase] = {
      label: `${args.label} の取得に失敗`,
      fileName: args.fileName,
      relativePath: ''
    };
  }
}

async function writeScenarioReport(args: {
  definition: ScenarioDefinition;
  reportContext: ScenarioReportContext;
  stepResults: StepResult[];
  targetUrl: string;
  finalUrl: string;
  failureMessage?: string;
}): Promise<void> {
  const { definition, reportContext, stepResults, targetUrl, finalUrl, failureMessage } = args;
  const scenarioReport: StoredScenarioReport = {
    id: definition.id,
    title: definition.title,
    objective: definition.objective,
    targetUrl,
    finalUrl,
    status: !failureMessage && stepResults.every((step) => step.status === 'passed') ? 'passed' : 'failed',
    failureMessage,
    steps: stepResults,
    screenshots: reportContext.screenshots
  };

  const resultsPath = path.join(reportContext.reportGroupDir, 'results.json');
  const currentGroupReport = await readGroupReport(resultsPath, reportContext.reportGroup);
  const nextGroupReport: StoredGroupReport = {
    reportGroup: reportContext.reportGroup,
    scenarios: [...currentGroupReport.scenarios.filter((scenario) => scenario.id !== definition.id), scenarioReport].sort((left, right) =>
      left.id.localeCompare(right.id, 'ja')
    )
  };

  await writeFile(resultsPath, JSON.stringify(nextGroupReport, null, 2), 'utf8');
  await writeFile(path.join(reportContext.reportGroupDir, 'index.html'), renderGroupReportHtml(nextGroupReport), 'utf8');
}

async function cleanupScenarioFiles(definition: ScenarioDefinition, dataDir: string): Promise<void> {
  const filesToRemove = Object.values(definition.screenshotNames).map((fileName) => path.join(dataDir, fileName));
  
  // ステップごとのスクリーンショットも削除対象に追加
  for (const step of definition.steps) {
    if (step.screenshot) {
      filesToRemove.push(path.join(dataDir, step.screenshot));
    }
  }

  await Promise.all(filesToRemove.map((filePath) => rm(filePath, { force: true })));
}

async function readGroupReport(resultsPath: string, reportGroup: string): Promise<StoredGroupReport> {
  try {
    const raw = await readFile(resultsPath, 'utf8');
    const parsed = JSON.parse(raw) as StoredGroupReport;

    return {
      reportGroup,
      scenarios: Array.isArray(parsed.scenarios) ? parsed.scenarios : []
    };
  } catch {
    return {
      reportGroup,
      scenarios: []
    };
  }
}

function renderGroupReportHtml(groupReport: StoredGroupReport): string {
  const scenarioCards = groupReport.scenarios
    .map((scenario) => {
      const statusColor = scenario.status === 'passed' ? '#1b4332' : '#9d0208';
      const statusBackground = scenario.status === 'passed' ? '#d8f3dc' : '#ffd6d6';

      return `<section class="panel">
      <span class="status" style="background:${statusBackground};color:${statusColor};">${escapeHtml(scenario.status.toUpperCase())}</span>
      <h2>${escapeHtml(scenario.title)}</h2>
      <p><strong>ID:</strong> <code>${escapeHtml(scenario.id)}</code></p>
      <p>${escapeHtml(scenario.objective)}</p>
      <p><strong>Target URL:</strong> <code>${escapeHtml(scenario.targetUrl)}</code></p>
      <p><strong>Final URL:</strong> <code>${escapeHtml(scenario.finalUrl)}</code></p>
      ${scenario.failureMessage ? `<p><strong>Error:</strong> ${escapeHtml(scenario.failureMessage)}</p>` : ''}
      <table>
        <thead>
          <tr>
            <th>Step</th>
            <th>Action</th>
            <th>Expected Result</th>
            <th>Status</th>
            <th>Screenshot</th>
          </tr>
        </thead>
        <tbody>
          ${scenario.steps
            .map(
              (step) => `<tr>
            <td>${escapeHtml(step.name)}</td>
            <td>${escapeHtml(step.action)}</td>
            <td>${escapeHtml(step.expected)}</td>
            <td>${escapeHtml(step.status)}${step.errorMessage ? `<br />${escapeHtml(step.errorMessage)}` : ''}</td>
            <td>${step.screenshot ? `<a href="${escapeHtml(step.screenshot.relativePath)}" target="_blank">${escapeHtml(step.screenshot.fileName)}</a>` : '-'}</td>
          </tr>`
            )
            .join('')}
        </tbody>
      </table>
      ${renderStepScreenshots(scenario.steps)}
    </section>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(groupReport.reportGroup)} Test Report</title>
    <style>
      body {
        margin: 0;
        padding: 32px;
        font-family: "Segoe UI", sans-serif;
        background: #f4f6fb;
        color: #14213d;
      }
      .panel {
        background: #ffffff;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 16px 40px rgba(20, 33, 61, 0.08);
        margin-bottom: 24px;
      }
      .status {
        display: inline-block;
        padding: 8px 14px;
        border-radius: 999px;
        font-weight: 700;
      }
      h1, h2 {
        margin-top: 0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border-bottom: 1px solid #d9e2ec;
        padding: 12px;
        text-align: left;
        vertical-align: top;
      }
      .gallery {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px;
      }
      .shot {
        border: 1px solid #d9e2ec;
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
      }
      .shot img {
        width: 100%;
        display: block;
      }
      .shot p {
        margin: 0;
        padding: 12px;
        font-weight: 600;
      }
      code {
        font-family: Consolas, monospace;
      }
    </style>
  </head>
  <body>
    <section class="panel">
      <h1>${escapeHtml(groupReport.reportGroup)} Test Report</h1>
      <p>同じ画面ファイルに書かれた複数テストを、このフォルダでまとめて確認できます。</p>
    </section>
    ${scenarioCards}
  </body>
</html>`;
}

function renderScreenshot(screenshot?: ScreenshotResult): string {
  if (!screenshot || !screenshot.relativePath) {
    return '<article class="shot"><p>スクリーンショットを取得できませんでした。</p></article>';
  }

  return `<article class="shot"><img src="${escapeHtml(screenshot.relativePath)}" alt="${escapeHtml(screenshot.label)}" /><p>${escapeHtml(screenshot.label)}: ${escapeHtml(screenshot.fileName)}</p></article>`;
}

function renderStepScreenshots(steps: StepResult[]): string {
  const stepScreenshots = steps.filter((step) => step.screenshot);
  
  if (stepScreenshots.length === 0) {
    return '';
  }
  
  return `
    <h3>ステップごとのスクリーンショット</h3>
    <div class="gallery">
      ${stepScreenshots.map((step) => renderScreenshot(step.screenshot)).join('')}
    </div>
  `;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}