/**
 * Guards against a classic mistake when annotating JSX: a `// comment` placed among
 * JSX children is not a comment, it renders as visible text. This parses every .tsx
 * file and fails if any JSX text contains a line that starts with `//` or `/*`.
 *
 *   node scripts/check-jsx-comments.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";

const roots = ["app", "components", "features", "context", "lib"];
const problems = [];

function walk(directory) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);

    if (statSync(path).isDirectory()) {
      walk(path);
    } else if (path.endsWith(".tsx")) {
      check(path);
    }
  }
}

function check(path) {
  const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  function visit(node) {
    if (ts.isJsxText(node)) {
      node.text.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("//") || trimmed.startsWith("/*")) {
          const { line: lineNumber } = source.getLineAndCharacterOfPosition(node.getStart());
          problems.push(`${path}:${lineNumber + 1} JSX text looks like a comment: ${trimmed.slice(0, 80)}`);
        }
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
}

roots.forEach((root) => walk(root));

if (problems.length > 0) {
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log("No comment-like JSX text found.");
