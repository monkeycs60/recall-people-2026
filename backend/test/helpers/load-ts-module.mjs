import { mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const backendRoot = resolve(__dirname, '../..');

export async function loadTsModule({
  entryPoint,
  suiteName,
  esbuildOptions = {},
}) {
  const outdir = resolve(backendRoot, '.tmp-tests', suiteName);
  const outfile = resolve(outdir, 'module.mjs');

  await rm(outdir, { force: true, recursive: true });
  await mkdir(outdir, { recursive: true });
  await esbuild.build({
    entryPoints: [resolve(backendRoot, entryPoint)],
    outfile,
    bundle: true,
    platform: 'neutral',
    format: 'esm',
    target: 'es2022',
    ...esbuildOptions,
  });

  return import(`${pathToFileURL(outfile).href}?t=${Date.now()}`);
}

export async function cleanTsModule(suiteName) {
  await rm(resolve(backendRoot, '.tmp-tests', suiteName), {
    force: true,
    recursive: true,
  });
}
