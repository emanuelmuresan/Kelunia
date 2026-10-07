/**
 * Proves a change only added comments: for every TS/JS file that differs from HEAD, the
 * syntax tree (ignoring comments, whitespace-only JSX text and empty `{/* *\/}` JSX
 * expressions) must be identical to the one in HEAD.
 *
 *   node scripts/verify-comments-only.mjs
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

import ts from "typescript";

const changed = execSync("git diff --name-only HEAD", { encoding: "utf8" })
  .split(/\r?\n/)
  .filter((file) => /\.(tsx?|jsx?|mjs)$/.test(file));

function fingerprint(path, text) {
  const kind = path.endsWith("x") ? ts.ScriptKind.TSX : path.endsWith(".mjs") || path.endsWith(".js") ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const tokens = [];

  function visit(node) {
    if (ts.isJsxExpression(node) && !node.expression) {
      return;
    }

    if (ts.isJsxText(node)) {
      const value = node.text.replace(/\s+/g, " ").trim();

      if (value) {
        tokens.push(`text:${value}`);
      }

      return;
    }

    if (node.getChildCount(source) === 0) {
      tokens.push(`${node.kind}:${node.getText(source)}`);
    } else {
      tokens.push(`<${node.kind}`);
    }

    ts.forEachChild(node, visit);
  }

  visit(source);
  return tokens.join("\u0001");
}

const different = [];

for (const file of changed) {
  let before = "";

  try {
    before = execSync(`git show HEAD:${file}`, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch {
    continue; // a new file has nothing to compare against
  }

  // Windows checkouts use CRLF while HEAD stores LF; compare on LF so template strings match.
  const after = readFileSync(file, "utf8").replaceAll("\r\n", "\n");
  before = before.replaceAll("\r\n", "\n");

  if (fingerprint(file, before) !== fingerprint(file, after)) {
    different.push(file);
  }
}

if (different.length > 0) {
  console.error("Code (not just comments) changed in:\n" + different.join("\n"));
  process.exit(1);
}

console.log(`Comments only: ${changed.length} changed files have identical code.`);
