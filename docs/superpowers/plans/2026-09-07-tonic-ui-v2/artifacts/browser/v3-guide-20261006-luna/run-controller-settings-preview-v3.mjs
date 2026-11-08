import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const scratch = process.env.V3_SCRATCH_DIR || '/tmp/cncjs-v3-guide-20261006-luna-0e46609d';
const runner = path.join(dir, 'controller-settings-preview-focused-v3.mjs');
const resultFile = path.join(dir, 'controller-settings-preview-matrix-v3.json');
const serialPath = process.env.V3_SERIAL_PATH || path.join(scratch, 'ttyGRBL');
const playwrightModule = process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs';
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const sourceDiffSha256 = crypto.createHash('sha256').update(spawnSync('git', ['diff', '--', 'package.json', 'yarn.lock', 'src/app']).stdout).digest('hex');
const cases = ['Grbl', 'Marlin'].flatMap(type => ['light', 'dark'].map(theme => ({ type, theme, key: `${type.toLowerCase()}-${theme}` })));
const result = {
  task: 'V3-GV Grbl/Marlin fixed-dark controller settings preview light/dark visual validation',
  revision,
  sourceDiffSha256,
  expectedSourceDiffSha256: 'f2d53df88181497311cbe2d154d32bf33bc7df23b787fb7c2e759c821f8401e9',
  model: { name: 'gpt-6-luna', reasoningEffort: 'xhigh', basis: 'user-selected active task/session assignment' },
  fixtureIsolation: 'one active controller fixture per fresh browser context; Grbl uses only the owned local simulator lifecycle; Marlin uses only incoming UI fixture replay; no refresh, CNC command, motion, or macro execution',
  status: 'in_progress',
  cases: [],
  startedAt: new Date().toISOString()
};
function flush() {
  result.updatedAt = new Date().toISOString();
  fs.writeFileSync(resultFile, `${JSON.stringify(result, null, 2)}\n`);
}
for (const item of cases) {
  const report = `controller-settings-preview-${item.key}.json`;
  const progress = `controller-settings-preview-${item.key}-progress.json`;
  const child = spawnSync(process.execPath, [runner], {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 12 * 1024 * 1024,
    env: {
      ...process.env,
      PLAYWRIGHT_MODULE: playwrightModule,
      V3_BASE_URL: process.env.V3_BASE_URL || 'http://127.0.0.1:8080',
      V3_SERIAL_PATH: serialPath,
      V3_CONTROLLER_FILTER: item.type,
      V3_REQUIRE_SINGLE_FIXTURE: '1',
      V3_SKIP_VIEW_CASES: '1',
      V3_MARLIN_THEME: item.theme,
      V3_RESULT_FILE: report,
      V3_PROGRESS_FILE: progress
    }
  });
  fs.writeFileSync(path.join(scratch, `controller-settings-preview-${item.key}.stdout.log`), child.stdout || '', { mode: 0o600 });
  fs.writeFileSync(path.join(scratch, `controller-settings-preview-${item.key}.stderr.log`), child.stderr || '', { mode: 0o600 });
  const reportPath = path.join(dir, report);
  const run = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
  const targetGate = run?.gates?.find(gate => item.type === 'Grbl' ? gate.name.includes('live Grbl simulator') : gate.name.includes('Marlin controller replay'));
  const evidence = targetGate?.settingsPreviewEvidence || null;
  const caseStatus = run?.status === 'passed' && child.status === 0 && Boolean(evidence) && (run.outgoingCommands || []).length === 0 ? 'passed' : 'failed';
  result.cases.push({
    ...item,
    status: caseStatus,
    report,
    childExitCode: child.status,
    settingsPreviewEvidence: evidence,
    outgoingCommands: run?.outgoingCommands || [],
    pageErrors: run?.pageErrors || [],
    requestFailures: run?.requestFailures || [],
    httpErrors: run?.httpErrors || [],
    warnings: run?.consoleIssues || [],
    screenshot: evidence?.screenshot || null,
    stderrExcerpt: child.stderr?.slice(0, 1200) || ''
  });
  result.status = result.cases.every(record => record.status === 'passed') ? 'in_progress' : 'partial-failures';
  flush();
}
const byType = Object.fromEntries(['grbl', 'marlin'].map(type => {
  const light = result.cases.find(item => item.key === `${type}-light`)?.settingsPreviewEvidence;
  const dark = result.cases.find(item => item.key === `${type}-dark`)?.settingsPreviewEvidence;
  const same = Boolean(light && dark && light.background === dark.background && light.foreground === dark.foreground && light.border === dark.border && light.contrastRatio >= 4.5 && dark.contrastRatio >= 4.5);
  return [type, { sameFixedDarkColorsAcrossThemes: same, light: light ? { background: light.background, foreground: light.foreground, border: light.border, contrastRatio: light.contrastRatio } : null, dark: dark ? { background: dark.background, foreground: dark.foreground, border: dark.border, contrastRatio: dark.contrastRatio } : null }];
}));
result.fixedDarkThemeInvariants = byType;
result.status = result.cases.every(record => record.status === 'passed') && Object.values(byType).every(value => value.sameFixedDarkColorsAcrossThemes) ? 'passed' : 'partial-failures';
result.completedAt = new Date().toISOString();
flush();
console.log(JSON.stringify({ status: result.status, cases: result.cases.map(({ key, status, screenshot, settingsPreviewEvidence }) => ({ key, status, screenshot, settingsPreviewEvidence })), fixedDarkThemeInvariants: byType }, null, 2));
