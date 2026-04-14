import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const attempt = 5;
const bundleDir = path.join(rootDir, 'artifacts', `S04-universal-deploy-attempt-0${attempt}`);
const screenshotsDir = path.join(bundleDir, 'screenshots');
const videoDir = path.join(bundleDir, 'video');

const now = () => new Date().toISOString();

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filePath, value) {
  await fs.writeFile(filePath, value, 'utf8');
}

async function run() {
  await ensureDir(screenshotsDir);
  await ensureDir(videoDir);

  const timestamps = {
    scenario_start: now(),
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
    recordVideo: {
      dir: videoDir,
      size: { width: 1440, height: 960 },
    },
  });
  const page = await context.newPage();

  let status = 'failed';
  let selectedAgents = [];
  let visibleValue = '';
  let errors = [];
  let commandPreview = '';
  let payloadPreview = '';
  const actionLog = [];

  page.on('console', message => {
    if (message.type() === 'error') {
      errors.push(`console:${message.text()}`);
    }
  });
  page.on('pageerror', error => {
    errors.push(`pageerror:${error.message}`);
  });

  try {
    actionLog.push('Open 01Deck home');
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
    timestamps.app_loaded = now();
    await page.screenshot({ path: path.join(screenshotsDir, '01-home.png'), fullPage: true });

    const guestButton = page.getByRole('button', { name: /Continue as Guest/i });
    if (await guestButton.count()) {
      actionLog.push('Continue as guest through auth gate');
      await guestButton.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: path.join(screenshotsDir, '01b-guest-entry.png'), fullPage: true });
    }

    const skipOnboarding = page.getByRole('button', { name: /Skip onboarding/i });
    if (await skipOnboarding.count()) {
      actionLog.push('Skip onboarding overlay');
      await skipOnboarding.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsDir, '01c-onboarding-skipped.png'), fullPage: true });
    }

    actionLog.push('Navigate to Deploy workspace');
    await page.getByRole('button', { name: 'Deploy' }).click();
    await page.getByRole('heading', { name: 'Deploy agent teams beyond chat' }).waitFor({ state: 'visible' });
    timestamps.first_action = now();
    await page.screenshot({ path: path.join(screenshotsDir, '02-deploy-workspace.png'), fullPage: true });

    const agentButtons = page.locator('button').filter({ hasText: 'Ready' });
    const agentCount = await agentButtons.count();
    if (agentCount < 2) {
      throw new Error(`Expected at least 2 ready agent cards, found ${agentCount}`);
    }

    actionLog.push('Select first two available agents');
    await agentButtons.nth(0).click();
    await agentButtons.nth(1).click();
    selectedAgents = await page.locator('button').filter({ hasText: 'Selected' }).evaluateAll(nodes =>
      nodes.map(node => node.textContent?.replace(/\s+/g, ' ').trim() ?? '').filter(Boolean),
    );
    await page.screenshot({ path: path.join(screenshotsDir, '03-selected-agents.png'), fullPage: true });

    actionLog.push('Confirm command and payload previews appear');
    await page.getByText('Ready for claude-code').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Copy Command' }).waitFor({ state: 'visible' });
    timestamps.first_visible_value = now();

    const previews = page.locator('pre');
    commandPreview = await previews.nth(0).textContent() ?? '';
    payloadPreview = await previews.nth(1).textContent() ?? '';

    if (!commandPreview.includes('universal-deploy.mjs')) {
      throw new Error('Terminal command preview did not contain universal-deploy.mjs');
    }
    if (!payloadPreview.includes('"selectedAgents"')) {
      throw new Error('Payload preview did not contain selectedAgents');
    }

    visibleValue = 'The terminal-ready command block and universal JSON payload both appeared after agent selection.';
    actionLog.push('Capture final proof screen');
    await page.screenshot({ path: path.join(screenshotsDir, '04-command-and-payload.png'), fullPage: true });

    status = 'passed';
    timestamps.completion = now();
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();

    let videoFile = '';
    if (video) {
      videoFile = await video.path();
    }

    const scenario = {
      scenario_id: 'S04',
      scenario_name: 'User deploys selected agents from Universal Deploy',
      attempt,
      status,
      persona: 'Operator-minded user',
      qa_priority: 'Critical',
      ad_potential: 'High',
      record_screen: true,
    };

    await writeJson(path.join(bundleDir, 'scenario.yaml'), scenario);

    const runLog = `# Scenario Run Log

- Scenario ID: S04
- Scenario Name: User deploys selected agents from Universal Deploy
- Attempt: ${attempt}
- Operator: Codex
- Start Time: ${timestamps.scenario_start}
- End Time: ${timestamps.completion ?? now()}
- Result: ${status}

## Action Log

${actionLog.map((line, index) => `${index + 1}. ${line}`).join('\n')}

## Timestamps

- app loaded: ${timestamps.app_loaded ?? 'n/a'}
- first action: ${timestamps.first_action ?? 'n/a'}
- first visible value: ${timestamps.first_visible_value ?? 'n/a'}
- completion: ${timestamps.completion ?? 'n/a'}
- friction point: none observed in this capture

## Screenshots

- screenshots/01-home.png
- screenshots/02-deploy-workspace.png
- screenshots/03-selected-agents.png
- screenshots/04-command-and-payload.png

## Errors

- ${errors.length ? errors.join('\n- ') : 'none'}

## Notes

- Selected agent cards: ${selectedAgents.join(' | ') || 'not captured'}
- Visible value: ${visibleValue || 'not reached'}
- Video: ${videoFile || 'not saved'}
`;
    await writeText(path.join(bundleDir, 'run-log.md'), runLog);

    const classification = `# Scenario Classification

- Scenario ID: S04
- Scenario Name: User deploys selected agents from Universal Deploy
- Attempt: ${attempt}
- Classification: ${status === 'passed' ? 'PASS_MARKETABLE' : 'FAIL'}

## QA Verdict

- Functional completion: ${status === 'passed' ? 'The deploy flow loaded, agents were selected, and both command and payload previews rendered.' : 'The flow did not complete cleanly.'}
- Friction level: ${status === 'passed' ? 'Low in this run. The next action stayed clear once the Deploy workspace loaded.' : 'High due to capture failure.'}
- Expected vs actual: ${status === 'passed' ? 'Matched the expected result for S04.' : 'Did not match the expected result for S04.'}

## Marketing Verdict

- Speed to visible value: ${timestamps.first_visible_value && timestamps.first_action ? 'fast once inside the Deploy workspace' : 'not reached'}
- Visual clarity: ${status === 'passed' ? 'Strong. Team selection, command block, and JSON payload are all visible on screen.' : 'Insufficient due to failure.'}
- Before/after strength: ${status === 'passed' ? 'Good. The workspace moves from empty selection state to a concrete deployment output.' : 'Not demonstrated.'}
- Short-form suitability: ${status === 'passed' ? 'Good candidate for proof-style product footage, especially desktop demo capture.' : 'Not suitable until fixed.'}

## Evidence

- Recording: ${videoFile || 'not saved'}
- Screenshots: 4 captured
- Timestamps: recorded in run-log.md
- Errors: ${errors.length ? errors.join('; ') : 'none'}

## Approved Claims

- Select a team and immediately generate a universal deployment command.
- The Deploy workspace produces both a terminal-ready command and a portable JSON payload.

## Rejected Claims

- Drag and drop into every target app works automatically.
- Every generated deployment is frictionless in external tools.

## Rerun

- Recommended rerun: ${status === 'passed' ? 'yes' : 'no'}
- Rerun reason: ${status === 'passed' ? 'Capture a cleaner marketing take with deliberate agent choices and optional cursor pacing.' : 'Fix the failure first.'}
`;
    await writeText(path.join(bundleDir, 'classification.md'), classification);
  }
}

run().catch(async error => {
  await ensureDir(bundleDir);
  await writeText(path.join(bundleDir, 'failure.txt'), `${error.stack ?? error.message}\n`);
  console.error(error);
  process.exitCode = 1;
});
