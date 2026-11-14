#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const semver = require('semver');

const ROOT_DOCUMENTS = ['README.md', 'AGENTS.md'];
const OPTIONAL_DOCUMENTS = ['CLAUDE.md'];
const SKILL_DIRECTORIES = ['skills', '.agents', '.claude/skills'];
const DOCUMENT_EXTENSIONS = /\.(?:md|mdx|markdown|txt|ya?ml|json)$/i;

const SUPPORT_HEADING = /^##\s+Supported Node\.js Versions\s*$/i;
const ANY_HEADING = /^#{1,6}\s+/;
const UNSUPPORTED_STATUS = /(?:not supported|unsupported|end[- ]of[- ]life|\bEOL\b|deprecated|removed|dropped)/i;
// A historical/unsupported claim must start at the version itself. This keeps
// the check fail-closed: an unrelated "removed" elsewhere in the sentence does
// not excuse a stale Node.js requirement.
const UNSUPPORTED_CLAIM = new RegExp([
  String.raw`^(?:v)?\d+(?:\.\d+){0,2}(?:\+|[.]x)?`,
  String.raw`(?:\s*(?:,|and|or)\s*(?:v)?\d+(?:\.\d+){0,2}(?:\+|[.]x)?)*`,
  String.raw`\s*(?:(?:is|are|was|were|has been|have been)\s+)?`,
  String.raw`(?:not supported|unsupported|end[- ]of[- ]life|\bEOL\b|no longer supported|deprecated|removed|dropped|`,
  String.raw`(?:does|do)(?: not|n't) (?:receive|support|apply|include)|was supported until|previously supported|`,
  String.raw`formerly supported|used to be supported|reached end[- ]of[- ]life)\b`,
].join(''), 'i');

const NODE_NAME = String.raw`Node(?:\.js|JS)?\b`;
const VERSION_TOKEN = String.raw`\d+(?:\.\d+){0,2}(?:\+|[.]x\b)?`;
const NODE_LIST = new RegExp([
  NODE_NAME,
  String.raw`\s*(?:version\s*)?(?:[≥>]=?|v)?\s*(?:[:=]\s*)?`,
  String.raw`(${VERSION_TOKEN}(?:\s*(?:,|and|or)\s*(?:v)?${VERSION_TOKEN})*)`,
].join(''), 'gi');
const VERSION_TOKEN_REGEX = new RegExp(VERSION_TOKEN, 'gi');
const NVM_VERSION = /\bnvm\s+(?:install|use)\s+(?:--?\S+\s+)*(\d+(?:\.\d+){0,2}(?:\+|[.]x\b)?)/gi;
const NODE_VERSION_KEY = /\bnode-version\s*[:=]\s*\[?\s*['"]?(\d+(?:\.\d+){0,2}(?:\+|[.]x\b)?)/gi;
const NODE_ENGINE_KEY = /\bnode\s*["']?\s*[:=]\s*["']?(?:[<>=^~]\s*)?(\d+(?:\.\d+){0,2}(?:\+|[.]x\b)?)/gi;
const DOTTED_VERSION = /\b(\d+\.\d+(?:\.\d+)?(?:\+|[.]x\b)?)\b/gi;
const SUPPORTED_LINES = /\b(\d+(?:\s*(?:,|and|or)\s*\d+)*)\s+lines?\b/gi;
const TABLE_VERSION = /\b(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\+|[.]x\b)?\b/gi;

/*
 * Recognized claims:
 * - Node.js 24, Node.js 24.22.1, Node.js 24.x, Node.js >=18, Node.js v18
 * - Node.js 24 and 26 (major-only list)
 * - nvm install 24 / nvm use 24
 * - node-version: 24
 * - README supported-versions table rows
 * Explicitly unsupported claims must start at the version and use a phrase such
 * as "is not supported", "reached end-of-life", or "does not receive". A bundled
 * runtime version must appear as "bundles ... Node.js <version> runtime".
 */
/**
 * Machine-readable policy for the drift check. The version source of truth is
 * package.json `engines.node`; README's supported-versions table is the human
 * source of truth. Explicitly unsupported or historical versions are allowed,
 * as are versions described as applying to the bundled desktop runtime.
 */
const POLICY = {
  rootDocuments: ROOT_DOCUMENTS,
  optionalDocuments: OPTIONAL_DOCUMENTS,
  skillDirectories: SKILL_DIRECTORIES,
  documentExtensions: DOCUMENT_EXTENSIONS,
  readmeSupportHeading: SUPPORT_HEADING,
  unsupportedStatus: UNSUPPORTED_STATUS,
  unsupportedClaim: UNSUPPORTED_CLAIM,
  bundledRuntimeSyntax: 'bundles ... Node.js <version> runtime',
};

const splitTableRow = line => line
  .trim()
  .replace(/^\|/, '')
  .replace(/\|$/, '')
  .split('|')
  .map(cell => cell.trim());
const isTableSeparator = cells => cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
const isTableLine = line => line.includes('|');
const matchAll = (text, regex) => [...text.matchAll(new RegExp(regex.source, regex.flags))];

function parseVersionToken(token) {
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:\+|[.]x)?$/i.exec(String(token).trim().replace(/^v/i, ''));
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: match[2] === undefined ? null : Number(match[2]),
    patch: match[3] === undefined ? null : Number(match[3]),
    text: String(token).trim(),
  };
}

function isSupported(version, engineRange) {
  if (version.minor === null) {
    return semver.intersects(engineRange, `${version.major}.x`);
  }
  if (version.patch === null) {
    return semver.intersects(engineRange, `${version.major}.${version.minor}.x`);
  }
  return semver.satisfies(`${version.major}.${version.minor}.${version.patch}`, engineRange);
}

const escapeRegExp = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function isOpenEndedFrom(engineRange, version) {
  if (version.minor === null || version.patch === null) {
    return false;
  }
  const target = new semver.SemVer(`${version.major}.${version.minor}.${version.patch}`);
  const range = new semver.Range(engineRange);
  return range.set.some(comparators => {
    const lower = comparators.find(item => (item.operator === '>=' && item.semver.compare(target) <= 0) ||
      (item.operator === '>' && item.semver.compare(target) < 0));
    const upper = comparators.some(item => item.operator === '<' || item.operator === '<=');
    return Boolean(lower) && !upper;
  });
}

const isScopedLineClaim = claim => /\(\d+(?:\.\d+)*\.x\)/i.test(claim) || /\bin the \d+(?:\.\d+)*\.x line\b/i.test(claim);

function isAmbiguousLowerBound(claim, token, version, engineRange) {
  const lowerBound = new RegExp(String.raw`^(?:v)?${escapeRegExp(token)}\s+or\s+(?:higher|later|above|newer)\b`, 'i');
  return lowerBound.test(claim) && !isScopedLineClaim(claim) && !isOpenEndedFrom(engineRange, version);
}

function sentenceAt(text, offset) {
  const boundary = /[.!?;)]\s+(?=[A-Z("'`])/g;
  let start = 0;
  let end = text.length;
  let match;
  while ((match = boundary.exec(text))) {
    if (match.index + match[0].length <= offset) {
      start = match.index + match[0].length;
    } else {
      end = match.index + 1;
      break;
    }
  }
  return { text: text.slice(start, end), start, end };
}

function isBundledRuntime(sentence, token) {
  const version = escapeRegExp(token);
  return new RegExp(String.raw`\bbundl(?:e|es|ed|ing)\b[^.!?]{0,120}\bNode(?:\.js)?\s+${version}\s+runtime`, 'i').test(sentence) ||
    new RegExp(String.raw`\bNode(?:\.js)?\s+${version}\s+runtime[^.!?]{0,120}\bbundl`, 'i').test(sentence);
}

function listVersions(text) {
  return matchAll(text, NODE_LIST).flatMap(match => {
    const list = match[1];
    const listStart = match.index + match[0].indexOf(list);
    return matchAll(list, VERSION_TOKEN_REGEX).map(item => ({ token: item[0], index: listStart + item.index }));
  });
}

function isInside(root, filename) {
  const relative = path.relative(root, filename);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function walk(directory, root, visitedDirectories = new Set(), visitedFiles = new Set()) {
  if (!fs.existsSync(directory)) {
    return [];
  }
  let realDirectory;
  try {
    realDirectory = fs.realpathSync(directory);
  } catch (error) {
    return [];
  }
  if (!isInside(root, realDirectory) || visitedDirectories.has(realDirectory)) {
    return [];
  }
  visitedDirectories.add(realDirectory);

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    let stat;
    let real;
    try {
      stat = fs.statSync(filename);
      real = fs.realpathSync(filename);
    } catch (error) {
      // Broken symlinks cannot be read; skip them instead of failing the walk.
      return [];
    }
    if (!isInside(root, real)) {
      return [];
    }
    if (stat.isDirectory()) {
      return walk(filename, root, visitedDirectories, visitedFiles);
    }
    if (stat.isFile() && (DOCUMENT_EXTENSIONS.test(entry.name) || DOCUMENT_EXTENSIONS.test(real)) && !visitedFiles.has(real)) {
      visitedFiles.add(real);
      return [filename];
    }
    return [];
  });
}

function paragraphsFor(lines, skipLines) {
  const paragraphs = [];
  let current = null;
  lines.forEach((text, index) => {
    const line = index + 1;
    if (skipLines.has(line) || !text.trim()) {
      current = null;
      return;
    }
    if (!current) {
      current = { lines: [], startLine: line };
      paragraphs.push(current);
    }
    current.lines.push({ text, line });
  });
  return paragraphs;
}

function checkNodeVersions({ root = path.resolve(__dirname, '..') } = {}) {
  const violations = [];
  const reported = new Set();
  let files = 0;
  let versions = 0;

  const report = (file, line, rule, message) => {
    const item = { file, line: line || 1, rule, message };
    const key = JSON.stringify(item);
    if (!reported.has(key)) {
      reported.add(key);
      violations.push(item);
    }
  };

  const manifestPath = path.join(root, 'package.json');
  if (!fs.existsSync(manifestPath)) {
    report('package.json', 1, 'missing-manifest', 'package.json is required to read engines.node');
    return { files, versions, violations };
  }
  let engineRange;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    engineRange = manifest.engines && manifest.engines.node;
  } catch (error) {
    report('package.json', 1, 'invalid-manifest', error.message.split('\n')[0]);
    return { files, versions, violations };
  }
  if (!engineRange || !semver.validRange(engineRange)) {
    report('package.json', 1, 'invalid-engine', 'package.json engines.node is missing or not a valid semver range');
    return { files, versions, violations };
  }

  const validate = (file, line, token, context) => {
    const version = parseVersionToken(token);
    if (!version) {
      return;
    }
    versions += 1;
    if (context && !context.table) {
      if (UNSUPPORTED_CLAIM.test(context.claim)) {
        return;
      }
      if (isBundledRuntime(context.sentence, token)) {
        return;
      }
    }
    if (!isSupported(version, engineRange)) {
      report(file, line, 'node-version-drift', `Node.js ${version.text} is outside package.json engines.node (${engineRange})`);
      return;
    }
    if (context && isAmbiguousLowerBound(context.claim, token, version, engineRange)) {
      report(file, line, 'ambiguous-version-claim', `Node.js ${version.text} "or higher" includes versions outside package.json engines.node (${engineRange})`);
    }
  };

  const scanDocument = (file, filename, options = {}) => {
    files += 1;
    const text = fs.readFileSync(filename, 'utf8');
    const lines = text.split(/\r?\n/);
    const skipLines = new Set();
    const bareLines = new Set();

    if (options.readme) {
      const sectionStart = lines.findIndex(line => SUPPORT_HEADING.test(line));
      if (sectionStart < 0) {
        report(file, 1, 'missing-support-table', 'README.md has no "Supported Node.js Versions" section');
      } else {
        let sectionEnd = lines.length;
        for (let index = sectionStart + 1; index < lines.length; index += 1) {
          if (ANY_HEADING.test(lines[index])) {
            sectionEnd = index;
            break;
          }
        }
        for (let index = sectionStart + 1; index < sectionEnd; index += 1) {
          bareLines.add(index + 1);
        }

        const tableRows = [];
        for (let index = sectionStart + 1; index < sectionEnd; index += 1) {
          if (isTableLine(lines[index])) {
            tableRows.push({ index, cells: splitTableRow(lines[index]) });
            skipLines.add(index + 1);
          }
        }
        if (!tableRows.length) {
          report(file, sectionStart + 1, 'missing-support-table', 'Supported Node.js Versions section has no version table');
        } else {
          const header = tableRows[0];
          const versionIndex = header.cells.findIndex(cell => /^version$/i.test(cell));
          const statusIndex = header.cells.findIndex(cell => /^(?:supported level|status|support)$/i.test(cell));
          if (versionIndex < 0 || statusIndex < 0) {
            report(file, header.index + 1, 'invalid-support-table', 'Supported Node.js Versions table needs Version and Supported Level columns');
          } else {
            tableRows.slice(1).forEach(row => {
              if (isTableSeparator(row.cells)) {
                return;
              }
              const status = row.cells[statusIndex] || '';
              const versionCell = row.cells[versionIndex] || '';
              if (UNSUPPORTED_STATUS.test(status)) {
                return;
              }
              if (/^\s*(?:<|<=|≤)/.test(versionCell)) {
                report(file, row.index + 1, 'ambiguous-support-row', 'A supported table row must name an exact version or be marked Not supported');
                return;
              }
              matchAll(versionCell, TABLE_VERSION).forEach(match => validate(
                file,
                row.index + 1,
                match[0],
                { claim: versionCell, sentence: versionCell, table: true }
              ));
            });
          }
        }
      }
    }

    const paragraphs = paragraphsFor(lines, skipLines);
    paragraphs.forEach(paragraph => {
      const paragraphText = paragraph.lines.map(line => line.text).join('\n');
      let offset = 0;
      paragraph.lines.forEach(({ text: lineText, line }) => {
        const lineOffset = offset;
        offset += lineText.length + 1;
        const contextFor = index => {
          const absolute = lineOffset + index;
          const sentence = sentenceAt(paragraphText, absolute);
          return { sentence: sentence.text, claim: paragraphText.slice(absolute, sentence.end) };
        };

        listVersions(lineText).forEach(({ token, index }) => validate(file, line, token, contextFor(index)));

        matchAll(lineText, NVM_VERSION).forEach(match => validate(file, line, match[1], contextFor(match.index)));
        matchAll(lineText, NODE_VERSION_KEY).forEach(match => validate(file, line, match[1], contextFor(match.index)));
        matchAll(lineText, NODE_ENGINE_KEY).forEach(match => validate(file, line, match[1], contextFor(match.index)));

        if (bareLines.has(line)) {
          matchAll(lineText, DOTTED_VERSION).forEach(match => validate(file, line, match[1], contextFor(match.index)));
          matchAll(lineText, SUPPORTED_LINES).forEach(match => match[1].split(/\s*(?:,|and|or)\s*/i)
            .forEach(token => validate(file, line, token, contextFor(match.index))));
        }
      });
    });
  };

  ROOT_DOCUMENTS.forEach(document => {
    const filename = path.join(root, document);
    if (!fs.existsSync(filename)) {
      report(document, 1, 'missing-document', `${document} is required for the Node.js version drift check`);
      return;
    }
    scanDocument(document, filename, { readme: document === 'README.md' });
  });

  OPTIONAL_DOCUMENTS.forEach(document => {
    const filename = path.join(root, document);
    if (fs.existsSync(filename)) {
      scanDocument(document, filename);
    }
  });

  let realRoot = root;
  try {
    realRoot = fs.realpathSync(root);
  } catch (error) {
    // Keep the unresolved root if it cannot be resolved; walk() will skip it.
  }
  const visitedDirectories = new Set();
  const visitedFiles = new Set();
  SKILL_DIRECTORIES.forEach(directory => {
    walk(path.join(root, directory), realRoot, visitedDirectories, visitedFiles).forEach(filename => {
      scanDocument(path.relative(root, filename).split(path.sep).join('/'), filename);
    });
  });

  violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));
  return { files, versions, violations };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--root')) {
    console.error('Usage: node scripts/check-node-version-drift.js [--root <project>]');
    process.exit(2);
  }
  const result = checkNodeVersions(args.length ? { root: path.resolve(args[1]) } : {});
  result.violations.forEach(item => console.error(`${item.file}:${item.line} [${item.rule}] ${item.message}`));
  console.log(`Node version drift: ${result.files} files, ${result.versions} versions, ${result.violations.length} violations`);
  process.exitCode = result.violations.length ? 1 : 0;
}

module.exports = { checkNodeVersions, POLICY };
