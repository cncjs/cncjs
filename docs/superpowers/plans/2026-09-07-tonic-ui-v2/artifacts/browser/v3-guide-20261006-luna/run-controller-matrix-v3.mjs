import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const scratchDir = process.env.V3_SCRATCH_DIR || '/tmp/cncjs-v3-guide-20261006-luna-0e46609d';
const runner = path.join(artifactDir, 'marlin-replay-focused-v3.mjs');
const playwrightModule = process.env.PLAYWRIGHT_MODULE || '/Users/cheton/.nvm/versions/node/v24.21.0/lib/node_modules/playwright/index.mjs';
const serialPath = process.env.V3_SERIAL_PATH || path.join(scratchDir, 'ttyGRBL');
const revision = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const sourceDiffSha256 = crypto.createHash('sha256').update(spawnSync('git', ['diff', '--', 'package.json', 'yarn.lock', 'src/app']).stdout).digest('hex');
const cases = ['Grbl', 'Marlin', 'Smoothie', 'TinyG'].flatMap(type => ['light', 'dark'].map(theme => ({ type, theme, key: `${type.toLowerCase()}-${theme}` })));
const resultPath = path.join(artifactDir, 'controller-matrix-v3.json');
const result = {
  task: 'V3-GV four-controller light/dark visual matrix',
  revision,
  sourceDiffSha256,
  expectedSourceDiffSha256: 'f2d53df88181497311cbe2d154d32bf33bc7df23b787fb7c2e759c821f8401e9',
  model: { name: 'gpt-6-luna', reasoningEffort: 'xhigh', basis: 'user-selected active task/session assignment; model environment variables are not exposed' },
  fixtureIsolation: 'one active controller fixture per fresh browser context; actual local synthetic Grbl connection only for connection lifecycle; no hardware',
  status: 'in_progress',
  cases: [],
  startedAt: new Date().toISOString()
};

function flush(current = null) {
  result.current = current;
  result.updatedAt = new Date().toISOString();
  fs.writeFileSync(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  const globalPath = path.join(artifactDir, 'progress.json');
  const progress = JSON.parse(fs.readFileSync(globalPath, 'utf8'));
  progress.phase = current ? `single controller/theme case ${current.key}` : 'controller matrix finished';
  progress.focusedControllerMatrix = { status: result.status, current, cases: result.cases.map(item => ({ key: item.key, status: item.status, report: item.report, gates: item.gateCount, screenshots: item.screenshots?.length || 0, outgoingCommands: item.outgoingCommandCount })) };
  progress.updatedAt = new Date().toISOString();
  fs.writeFileSync(globalPath, `${JSON.stringify(progress, null, 2)}\n`);
}

for (const item of cases) {
  const report = `controller-${item.key}.json`;
  const progress = `controller-${item.key}-progress.json`;
  flush({ ...item, status: 'running', report });
  const existingPath = path.join(artifactDir, report);
  let child = null;
  if (item.key === 'grbl-light' && fs.existsSync(existingPath)) {
    const previous = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
    if (previous.revision === revision && previous.sourceDiffSha256 === sourceDiffSha256 && previous.status === 'passed') {
      child = { status: 'reused-current-task-evidence', stdout: '', stderr: '' };
    }
  }
  if (!child) {
    const env = {
      ...process.env,
      PLAYWRIGHT_MODULE: playwrightModule,
      V3_BASE_URL: process.env.V3_BASE_URL || 'http://127.0.0.1:8080',
      V3_SERIAL_PATH: serialPath,
      V3_CONTROLLER_FILTER: item.type,
      V3_REQUIRE_SINGLE_FIXTURE: '1',
      V3_MARLIN_THEME: item.theme,
      V3_RESULT_FILE: report,
      V3_PROGRESS_FILE: progress
    };
    child = spawnSync(process.execPath, [runner], { cwd: process.cwd(), env, encoding: 'utf8', maxBuffer: 12 * 1024 * 1024 });
  }
  fs.writeFileSync(path.join(scratchDir, `controller-${item.key}.stdout.log`), child.stdout || '', { mode: 0o600 });
  fs.writeFileSync(path.join(scratchDir, `controller-${item.key}.stderr.log`), child.stderr || '', { mode: 0o600 });
  const reportExists = fs.existsSync(existingPath);
  const run = reportExists ? JSON.parse(fs.readFileSync(existingPath, 'utf8')) : null;
  const outgoingCommands = run?.outgoingCommands || [];
  const status = !run ? 'failed' : (child.status === 'reused-current-task-evidence' ? 'passed' : run.status);
  const screenshots = (run?.gates || []).map(gate => gate.screenshot).filter(Boolean);
  const record = {
    key: item.key,
    type: item.type,
    theme: item.theme,
    report,
    status,
    gateCount: run?.gates?.length || 0,
    passedGates: run?.gates?.filter(gate => gate.status === 'passed').length || 0,
    failedGates: run?.gates?.filter(gate => gate.status === 'failed').map(gate => ({ name: gate.name, error: gate.error })) || [],
    screenshotCount: screenshots.length,
    screenshots,
    outgoingCommands,
    outgoingCommandCount: outgoingCommands.length,
    pageErrorCount: run?.pageErrors?.length ?? null,
    requestFailureCount: run?.requestFailures?.length ?? null,
    fixtureTypesActive: (run?.sourceContext?.fixture || '').includes(item.type) || item.type === 'Grbl',
    runnerExitCode: child.status
  };
  result.cases.push(record);
  flush(null);
  if (status !== 'passed') break;
}

result.status = result.cases.length === cases.length && result.cases.every(item => item.status === 'passed' && item.outgoingCommandCount === 0 && item.pageErrorCount === 0 && item.requestFailureCount === 0) ? 'passed' : 'failed';
result.completedAt = new Date().toISOString();
flush(null);
console.log(JSON.stringify({ status: result.status, cases: result.cases.map(({ key, status, gateCount, passedGates, failedGates, screenshotCount, outgoingCommandCount, pageErrorCount, requestFailureCount }) => ({ key, status, gateCount, passedGates, failedGates, screenshotCount, outgoingCommandCount, pageErrorCount, requestFailureCount })) }, null, 2));
if (result.status !== 'passed') process.exitCode = 1;
