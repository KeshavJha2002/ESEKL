/**
 * Test Invariant & Behavioral Guarantee Extractor (ESM)
 */

import { readFileSync } from "node:fs";
import { join, extname } from "node:path";

export function extractTestInvariantsFromRepo(repoPath, testFiles) {
  const scenarios = [];

  for (const relPath of testFiles) {
    const fullPath = join(repoPath, relPath);
    let content;
    try {
      content = readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }

    const lines = content.split("\n");
    const ext = extname(relPath).toLowerCase();

    // Go Tests (_test.go)
    if (ext === ".go") {
      let currentTestFunc = "";
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const funcMatch = line.match(/^func\s+(Test\w+)\s*\(/);
        if (funcMatch) {
          currentTestFunc = funcMatch[1];
        }

        const runMatch = line.match(/t\.Run\s*\(\s*["`]([^"`]+)["`]/);
        if (runMatch && currentTestFunc) {
          const subName = runMatch[1];
          scenarios.push({
            filePath: relPath,
            testFunction: currentTestFunc,
            subScenarioName: subName,
            line: i + 1,
            assertionTypes: ["t.Run", "testing"],
            inferredInvariant: `Guarantees scenario behavior: "${subName}" in ${currentTestFunc}`,
          });
        }
      }
    }

    // Python Tests (test_*.py or *_test.py)
    else if (ext === ".py") {
      let currentTestFunc = "";
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const defMatch = line.match(/^\s*def\s+(test_\w+)\s*\(/);
        if (defMatch) {
          currentTestFunc = defMatch[1];
          scenarios.push({
            filePath: relPath,
            testFunction: currentTestFunc,
            subScenarioName: currentTestFunc.replace(/^test_/, "").replace(/_/g, " "),
            line: i + 1,
            assertionTypes: ["pytest/unittest"],
            inferredInvariant: `Guarantees invariant: ${currentTestFunc}`,
          });
        }
      }
    }

    // TypeScript / JavaScript Tests (*.test.ts, *.spec.ts, *.test.js)
    else if (ext === ".ts" || ext === ".js" || ext === ".tsx" || ext === ".jsx") {
      let currentSuite = "";
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const describeMatch = line.match(/describe\s*\(\s*["'`]([^"'`]+)["'`]/);
        if (describeMatch) currentSuite = describeMatch[1];

        const itMatch = line.match(/(?:it|test)\s*\(\s*["'`]([^"'`]+)["'`]/);
        if (itMatch) {
          const itName = itMatch[1];
          scenarios.push({
            filePath: relPath,
            testFunction: currentSuite || "anonymous_suite",
            subScenarioName: itName,
            line: i + 1,
            assertionTypes: ["vitest/jest/mocha"],
            inferredInvariant: `Guarantees: ${currentSuite ? `${currentSuite} -> ` : ""}${itName}`,
          });
        }
      }
    }
  }

  return scenarios;
}
