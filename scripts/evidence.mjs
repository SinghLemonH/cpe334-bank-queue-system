/**
 * Sprint 1 evidence helper (Issue #11).
 *
 * Runs the API Jest suite, writes docs/sprints/sprint-1/evidence/results.json,
 * and prints a markdown table built from test titles. The JSON file is gitignored.
 * Attach this command's console output from a fresh clone of the release tag
 * to the GitHub Release. Do not commit it.
 *
 * Playwright (TEST-08, TEST-18, TEST-30) is a separate command: npm run test:e2e.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputFile = resolve(root, 'docs/sprints/sprint-1/evidence/results.json');

const playwrightOnly = [
  ['AC-08', 'TEST-08', 'apps/web/e2e/auth.spec.ts'],
  ['AC-18', 'TEST-18', 'apps/web/e2e/sprint1-journey.spec.ts'],
  ['AC-30', 'TEST-30', 'apps/web/e2e/sprint1-journey.spec.ts'],
];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', shell: false });
  return (result.stdout || '').trim();
}

function jestCommand() {
  const jestBin = resolve(root, 'node_modules/jest/bin/jest.js');
  return { command: process.execPath, args: [jestBin] };
}

mkdirSync(dirname(outputFile), { recursive: true });

const jest = jestCommand();
const jestRun = spawnSync(
  jest.command,
  [
    ...jest.args,
    '--config',
    'apps/api/jest.config.ts',
    '--runInBand',
    '--ci',
    '--json',
    `--outputFile=${outputFile}`,
  ],
  { cwd: root, encoding: 'utf8' },
);

process.stdout.write(jestRun.stdout || '');
process.stderr.write(jestRun.stderr || '');

if (jestRun.error) {
  console.error(jestRun.error.message);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(readFileSync(outputFile, 'utf8'));
} catch {
  console.error(`Jest did not write ${outputFile}`);
  process.exit(jestRun.status === null ? 1 : jestRun.status || 1);
}
const byId = new Map();

for (const suite of report.testResults || []) {
  const file = relative(root, suite.name).replaceAll('\\', '/');
  for (const test of suite.assertionResults || []) {
    const match = /^(TEST|UT)-(\d+)/.exec(test.title);
    if (!match) continue;
    const id = `${match[1]}-${match[2]}`;
    const acMatch = /AC-(\d+)/.exec(test.title);
    const row = byId.get(id) || { id, ac: acMatch ? `AC-${acMatch[1]}` : '', file, statuses: [] };
    if (acMatch) row.ac = `AC-${acMatch[1]}`;
    row.statuses.push(test.status);
    byId.set(id, row);
  }
}

function outcome(statuses) {
  if (statuses.some((status) => status === 'failed')) return 'failed';
  if (statuses.some((status) => status === 'pending' || status === 'todo')) return 'skipped';
  if (statuses.length > 0 && statuses.every((status) => status === 'passed')) return 'passed';
  return 'unknown';
}

const rows = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

console.log('');
console.log(`HEAD ${run('git', ['rev-parse', 'HEAD'])}`);
console.log(`node ${process.version}`);
console.log(`jest ${report.success ? 'success' : 'failed'} passed=${report.numPassedTests} failed=${report.numFailedTests} skipped=${report.numPendingTests} total=${report.numTotalTests}`);
console.log('');
console.log('| AC | TEST | File | Result |');
console.log('|---|---|---|---|');
for (const row of rows) {
  console.log(`| ${row.ac || '-'} | ${row.id} | ${row.file} | ${outcome(row.statuses)} |`);
}
console.log('');
console.log('Playwright tests are not in the Jest JSON. Run `npm run test:e2e` and keep that log with this one.');
console.log('');
console.log('| AC | TEST | File | Result |');
console.log('|---|---|---|---|');
for (const [ac, test, file] of playwrightOnly) {
  console.log(`| ${ac} | ${test} | ${file} | not-in-jest-run |`);
}

process.exit(jestRun.status === null ? 1 : jestRun.status);
