import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Every review capture goes through here so runs, tests, and color modes never
// overwrite each other. `E2E_SCREENSHOTS=1` is opt-in; without it nothing is written.
const root = fileURLToPath(new URL('../../../', import.meta.url));
const runId = `${Date.now().toString(36)}-${process.pid.toString(36)}`;

const slug = value => value.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 64) || 'case';

/**
 * Capture a page or element for review.
 * @param {object} target Playwright page or locator
 * @param {object} testInfo Current test metadata
 * @param {string} name Shot identity within the test
 * @param {{ fullPage?: boolean }} [options] Page-only capture options
 * @returns {Promise<string|null>} Written path, or null when disabled or failed
 */
export async function capture(target, testInfo, name, { fullPage = false } = {}) {
  if (process.env.E2E_SCREENSHOTS !== '1') {
    return null;
  }

  const file = relative(root, testInfo.file);
  const titlePath = testInfo.titlePath.slice(1);
  const id = createHash('sha256').update(JSON.stringify([file, titlePath])).digest('hex').slice(0, 10);
  const directory = resolve(
    root, 'output/e2e/screenshots', testInfo.project.name, `${slug(testInfo.title)}-${id}`, runId,
  );
  const artifact = `${slug(name)}.png`;
  const path = resolve(directory, artifact);

  try {
    await mkdir(directory, { recursive: true });
    await target.screenshot({ path, fullPage });
    const manifestPath = resolve(directory, 'manifest.json');
    const manifest = await readFile(manifestPath, 'utf8').then(JSON.parse).catch(() => ({
      file, titlePath, project: testInfo.project.name, run: runId, shots: [],
    }));
    manifest.shots = manifest.shots
      .filter(shot => shot.artifact !== artifact)
      .concat({ artifact, name });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    return path;
  } catch (error) {
    // A capture failure must not mask the scenario's own result.
    testInfo.annotations.push({ type: 'screenshot-error', description: error.name });
    console.error(`[e2e] Screenshot failed for ${name}: ${error.name}`);
    return null;
  }
}
