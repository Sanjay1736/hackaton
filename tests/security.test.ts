import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import ts from "typescript";
const root = resolve(import.meta.dirname, "..");
const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? files(resolve(dir, e.name))
      : /\.tsx?$/.test(e.name)
        ? [resolve(dir, e.name)]
        : [],
  );
const sources = ["app", "components", "lib"].flatMap((d) =>
  files(resolve(root, d)),
);
describe("client credential boundary", () => {
  it("client entrypoints cannot transitively import server-only modules or read private env", () => {
    const seen = new Set<string>();
    function visit(file: string) {
      if (seen.has(file)) return;
      seen.add(file);
      const code = readFileSync(file, "utf8");
      expect(code, `Private environment access in ${file}`).not.toMatch(
        /process\.env\.(QLOO_API_KEY|QLOO_BASE_URL)/,
      );
      const source = ts.createSourceFile(
        file,
        code,
        ts.ScriptTarget.Latest,
        true,
      );
      function follow(spec: string) {
        expect(spec, `Server-only dependency reachable from ${file}`).not.toBe(
          "server-only",
        );
        if (!spec.startsWith(".") && !spec.startsWith("@/")) return;
        const target = spec.startsWith("@/")
          ? resolve(root, spec.slice(2))
          : resolve(dirname(file), spec);
        const path = [
          target + ".ts",
          target + ".tsx",
          resolve(target, "index.ts"),
          resolve(target, "index.tsx"),
        ].find(existsSync);
        if (path) visit(path);
      }
      function walk(node: ts.Node) {
        if (
          ts.isImportDeclaration(node) &&
          !node.importClause?.isTypeOnly &&
          ts.isStringLiteral(node.moduleSpecifier)
        )
          follow(node.moduleSpecifier.text);
        if (
          ts.isExportDeclaration(node) &&
          !node.isTypeOnly &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        )
          follow(node.moduleSpecifier.text);
        if (
          ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            node.expression.getText(source) === "require") &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0])
        )
          follow(node.arguments[0].text);
        ts.forEachChild(node, walk);
      }
      walk(source);
    }
    const clients = sources.filter((file) =>
      /^['"]use client['"];/.test(readFileSync(file, "utf8")),
    );
    expect(clients.length).toBeGreaterThan(0);
    clients.forEach(visit);
  });
  it("does not define public credential environment variables or Next env serialization", () => {
    for (const file of [...sources, resolve(root, "next.config.ts")])
      expect(readFileSync(file, "utf8")).not.toMatch(
        /NEXT_PUBLIC_\w*(?:KEY|TOKEN|SECRET)/i,
      );
    expect(readFileSync(resolve(root, "next.config.ts"), "utf8")).not.toMatch(
      /\benv\s*:/,
    );
    for (const file of [
      "lib/qloo/client.ts",
      "lib/providers/index.ts",
      "lib/providers/qloo-taste-provider.ts",
      "lib/api.ts",
    ])
      expect(readFileSync(resolve(root, file), "utf8")).toMatch(
        /import ["']server-only["']/,
      );
  });
});
