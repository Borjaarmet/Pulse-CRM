import { build } from "esbuild";
import { mkdir, rm, readdir, stat } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "node:child_process";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, "..");
const testsDir = path.resolve(projectRoot, "tests");
const outDir = path.resolve(projectRoot, ".tmp-tests");

async function collectTestFiles(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectTestFiles(entryPath, acc);
      continue;
    }
    if (/\.test\.ts$/u.test(entry.name)) {
      acc.push(entryPath);
    }
  }
  return acc;
}

async function ensureDirEmpty(target) {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
}

async function compileTests(testFiles) {
  const alias = {
    "@": path.resolve(projectRoot, "client", "src"),
    "@shared": path.resolve(projectRoot, "shared"),
  };

  const outputs = await Promise.all(
    testFiles.map(async (testFile) => {
      const relative = path.relative(testsDir, testFile);
      const outFile = path.resolve(outDir, relative.replace(/\.ts$/u, ".mjs"));
      await mkdir(path.dirname(outFile), { recursive: true });
      await build({
        entryPoints: [testFile],
        outfile: outFile,
        format: "esm",
        platform: "node",
        bundle: true,
        sourcemap: "inline",
        target: "node20",
        alias,
      });
      return outFile;
    }),
  );

  return outputs;
}

async function runNodeTests(compiledFiles) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--test", ...compiledFiles], {
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Tests failed with exit code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    await ensureDirEmpty(outDir);
    const hasTestsDir = await stat(testsDir).then(() => true).catch(() => false);
    if (!hasTestsDir) {
      console.log("No test directory found, skipping.");
      return;
    }
    const testFiles = await collectTestFiles(testsDir);
    if (testFiles.length === 0) {
      console.log("No test files found, skipping.");
      return;
    }

    const compiledFiles = await compileTests(testFiles);
    await runNodeTests(compiledFiles);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await rm(outDir, { recursive: true, force: true }).catch(() => {});
  }
}

await main();
