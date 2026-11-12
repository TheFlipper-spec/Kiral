import { createServer } from 'vite';
import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import assert from 'node:assert/strict';

// Global shared state for test suites
if (!globalThis.__kiral_test_suites__) {
  globalThis.__kiral_test_suites__ = [];
  globalThis.__kiral_current_suite__ = 'Default Suite';
}

function getSuites() {
  return globalThis.__kiral_test_suites__;
}

function registerTest(name, fn) {
  const suites = getSuites();
  let suite = suites.find(s => s.name === globalThis.__kiral_current_suite__);
  if (!suite) {
    suite = { name: globalThis.__kiral_current_suite__, tests: [] };
    suites.push(suite);
  }
  suite.tests.push({ suite: globalThis.__kiral_current_suite__, name, fn });
}

export function describe(name, fn) {
  const parent = globalThis.__kiral_current_suite__;
  globalThis.__kiral_current_suite__ = parent === 'Default Suite' ? name : `${parent} > ${name}`;
  try {
    fn();
  } finally {
    globalThis.__kiral_current_suite__ = parent;
  }
}

export function it(name, fn) {
  registerTest(name, fn);
}

export const test = it;

export function expect(actual) {
  return {
    toBe(expected) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected) {
      assert.deepStrictEqual(actual, expected);
    },
    toBeTruthy() {
      assert.ok(actual);
    },
    toBeFalsy() {
      assert.ok(!actual);
    },
    toBeNull() {
      assert.strictEqual(actual, null);
    },
    toBeDefined() {
      assert.notStrictEqual(actual, undefined);
    },
    toBeUndefined() {
      assert.strictEqual(actual, undefined);
    },
    toBeGreaterThan(expected) {
      assert.ok(actual > expected, `Expected ${actual} to be greater than ${expected}`);
    },
    toBeGreaterThanOrEqual(expected) {
      assert.ok(actual >= expected, `Expected ${actual} to be >= ${expected}`);
    },
    toBeLessThan(expected) {
      assert.ok(actual < expected, `Expected ${actual} to be less than ${expected}`);
    },
    toBeLessThanOrEqual(expected) {
      assert.ok(actual <= expected, `Expected ${actual} to be <= ${expected}`);
    },
    toBeCloseTo(expected, delta = 0.001) {
      assert.ok(
        Math.abs(actual - expected) <= delta,
        `Expected ${actual} to be close to ${expected} within delta ${delta}`
      );
    },
    toContain(expected) {
      if (typeof actual === 'string' || Array.isArray(actual)) {
        assert.ok(
          actual.includes(expected),
          `Expected collection to contain ${JSON.stringify(expected)}`
        );
      } else if (actual instanceof Set) {
        assert.ok(actual.has(expected), `Expected Set to contain ${expected}`);
      } else {
        throw new Error(`toContain cannot check type ${typeof actual}`);
      }
    },
    toThrow(expectedError) {
      assert.throws(actual, expectedError);
    }
  };
}

// Attach harness globals
globalThis.describe = describe;
globalThis.it = it;
globalThis.test = it;
globalThis.expect = expect;
globalThis.assert = assert;

async function findTestFiles(dir, files = []) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      if (entry !== 'node_modules' && entry !== '.git' && entry !== 'dist') {
        await findTestFiles(fullPath, files);
      }
    } else if (entry.endsWith('.test.ts') || entry.endsWith('.test.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function run() {
  const startTime = Date.now();
  const vite = await createServer({
    server: { middlewareMode: true, hmr: false, ws: false },
    appType: 'custom',
    logLevel: 'warn'
  });

  const testDir = resolve(process.cwd(), 'tests');
  let testFiles = [];
  try {
    testFiles = await findTestFiles(testDir);
  } catch {
    testFiles = [];
  }

  console.log(`\x1b[1m\x1b[36m====================================================\x1b[0m`);
  console.log(`\x1b[1m\x1b[36m  Kiral Automated E2E Test Suite (Vite Runner)\x1b[0m`);
  console.log(`\x1b[1m\x1b[36m====================================================\x1b[0m`);
  console.log(`Discovered ${testFiles.length} test file(s) in tests/\n`);

  // Load all test modules to register test cases
  for (const file of testFiles) {
    const relFile = file.replace(process.cwd(), '').replace(/^[\\\/]/, '');
    globalThis.__kiral_current_suite__ = `[${relFile}]`;
    try {
      await vite.ssrLoadModule(file);
    } catch (err) {
      console.error(`\x1b[31mFailed to load test file ${relFile}:\x1b[0m`, err);
      process.exit(1);
    }
  }

  await vite.close();

  let passed = 0;
  let failed = 0;
  const failures = [];
  const suites = getSuites();

  // Execute all registered suites and tests
  for (const suite of suites) {
    if (suite.tests.length === 0) continue;
    console.log(`\x1b[1m\x1b[35m▶ ${suite.name}\x1b[0m`);
    for (const t of suite.tests) {
      const testStart = performance.now();
      try {
        const res = t.fn();
        if (res instanceof Promise) {
          await res;
        }
        const dur = (performance.now() - testStart).toFixed(1);
        passed++;
        console.log(`  \x1b[32m✔\x1b[0m ${t.name} \x1b[90m(${dur}ms)\x1b[0m`);
      } catch (err) {
        failed++;
        console.log(`  \x1b[31m✖\x1b[0m ${t.name}`);
        console.log(`    \x1b[31m${err.stack || err.message}\x1b[0m`);
        failures.push({ suite: suite.name, name: t.name, error: err });
      }
    }
    console.log('');
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\x1b[1m\x1b[36m====================================================\x1b[0m`);
  console.log(`\x1b[1mTest Results Summary:\x1b[0m`);
  console.log(`  Passed:  \x1b[32m${passed}\x1b[0m`);
  console.log(`  Failed:  ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
  console.log(`  Total:   ${passed + failed}`);
  console.log(`  Time:    ${elapsed}s`);
  console.log(`\x1b[1m\x1b[36m====================================================\x1b[0m`);

  if (failed > 0) {
    console.log(`\n\x1b[31mFailure breakdown:\x1b[0m`);
    for (const f of failures) {
      console.log(`- ${f.suite} > ${f.name}: ${f.error.message}`);
    }
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// Only auto-run if directly executed via CLI
const isDirectCli = process.argv[1] && (
  process.argv[1].endsWith('run-tests.mjs') ||
  process.argv[1].endsWith('run-tests.js')
);

if (isDirectCli && !globalThis.__kiral_runner_active__) {
  globalThis.__kiral_runner_active__ = true;
  run().catch(err => {
    console.error('Test runner fatal error:', err);
    process.exit(1);
  });
}
