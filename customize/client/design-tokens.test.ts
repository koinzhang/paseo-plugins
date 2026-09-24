import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";

const CLIENT_DIR = new URL(".", import.meta.url).pathname;

const RULES: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: "fontSize literal", pattern: /fontSize:\s*[0-9]/ },
  { name: "fontWeight literal", pattern: /fontWeight:\s*["'][0-9a-z]+["']/ },
  { name: "border radius literal", pattern: /[bB]order\w*Radius:\s*[0-9]/ },
  { name: "Icon size literal", pattern: /<Icon\b[^>]*\bsize=\{[0-9]/ },
  { name: "multi-line Icon size literal", pattern: /^\s*size=\{[0-9]+\}\s*$/ },
  { name: "hitSlop literal", pattern: /hitSlop=\{[0-9]/ },
];

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

test("client UI uses design tokens instead of raw type / radius / icon literals", () => {
  const violations: string[] = [];
  for (const file of tsxFiles(CLIENT_DIR)) {
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, index) => {
        for (const rule of RULES) {
          if (rule.pattern.test(line)) {
            violations.push(`${relative(CLIENT_DIR, file)}:${index + 1} ${rule.name}: ${line.trim()}`);
          }
        }
      });
  }
  assert.deepEqual(violations, [], "use client/design-tokens.ts (see docs/design-system.md)");
});
