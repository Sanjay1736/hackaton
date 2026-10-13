import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const root = process.env.TASTEWEAVE_TEST_BUILD === "1" ? ".next-test" : ".next";
const canary = process.env.QLOO_API_KEY;
if (!canary || !canary.startsWith("tasteweave-build-canary-"))
  throw new Error(
    "Run npm run build:verify to build with a non-secret canary first.",
  );
async function files(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)],
      ),
    )
  ).flat();
}
const assets = await files(join(root, "static"));
if (!assets.length) throw new Error("No client build artifacts found.");
for (const file of assets) {
  const contents = await readFile(file);
  if (contents.includes(Buffer.from(canary)))
    throw new Error(
      `Server credential canary appeared in a client asset: ${file}`,
    );
}
console.log(
  `PASS: server credential canary absent from ${assets.length} client build assets.`,
);
