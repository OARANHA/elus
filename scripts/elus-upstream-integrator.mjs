#!/usr/bin/env node
/**
 * Preparador conservador de atualizações DeskcommCRM -> ELUS.
 * NÃO toca banco, não executa migrations/E2E, não faz commit/push/merge/deploy.
 * Requer refs exatas já disponíveis no Git local (fetch explícito, fora daqui).
 *
 * node scripts/elus-upstream-integrator.mjs plan --base <sha40> --target <sha40>
 * node scripts/elus-upstream-integrator.mjs prepare --base <sha40> --target <sha40> --out <diretorio-novo>
 *
 * Só propõe/aplica arquivos de código fora das áreas protegidas quando o blob
 * local ainda é byte-idêntico à versão base. Todo conflito é revisão manual.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SHA = /^[0-9a-f]{40}$/;
const SAFE = /^(?:app\/|lib\/|components\/|workers\/|tests\/unit\/)/;
const DENY = /(?:^|\/)(?:\.env(?:\.|$)|secrets?\/|node_modules\/)|\.(?:pem|key|p12)$/i;

function git(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: options.binary ? null : 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    input: options.input,
  });
  if (result.error || result.status !== 0) {
    const stderr = result.stderr?.toString()?.trim().slice(0, 500) ?? '';
    throw new Error('GIT_FAILED: ' + args[0] + ' ' + stderr);
  }
  return result.stdout;
}

function blob(ref, path) {
  const result = spawnSync('git', ['rev-parse', '--verify', ref + ':' + path], {
    encoding: 'utf8', maxBuffer: 1024 * 1024,
  });
  if (result.status !== 0) return null;
  const output = result.stdout.trim();
  if (!SHA.test(output)) throw new Error('UNEXPECTED_BLOB');
  return output;
}

export function classify(base, target, head = 'HEAD') {
  if (![base, target].every(s => SHA.test(s))) throw new Error('PIN_REQUIRED');
  for (const ref of [base, target, head]) git(['rev-parse', '--verify', ref + '^{commit}']);
  const paths = git(['diff', '--name-only', '-z', '--no-renames', base, target]).split('\0').filter(Boolean);
  const results = paths.map(path => {
    const original = blob(base, path);
    const upstream = blob(target, path);
    const local = blob(head, path);
    let status;
    if (!SAFE.test(path) || DENY.test(path)) status = 'protected';
    else if (!upstream) status = 'deletion_requires_review';
    else if (local === upstream) status = 'already_integrated';
    else if (original === local) status = 'safe_to_prepare';
    else status = 'conflict_requires_review';
    return { path, status };
  });
  const totals = Object.fromEntries(
    [...new Set(results.map(x => x.status))].sort().map(k => [k, results.filter(x => x.status === k).length]),
  );
  return { base, target, localHead: git(['rev-parse', 'HEAD']).trim(), totals, results };
}

export function prepare(base, target, out) {
  if (!out || !isAbsolute(out)) throw new Error('ABSOLUTE_OUTPUT_PATH_REQUIRED');
  const dir = resolve(out);
  if (existsSync(dir)) throw new Error('OUTPUT_EXISTS');
  if (git(['status', '--porcelain']).trim()) throw new Error('LOCAL_WORKTREE_DIRTY');
  const report = classify(base, target);
  const safe = report.results.filter(x => x.status === 'safe_to_prepare').map(x => x.path);
  // Worktree isolada sem branch: nenhuma ref local é alterada e não há push.
  git(['worktree', 'add', '--detach', dir, 'HEAD']);
  try {
    if (safe.length) {
      const patch = git(['diff', '--binary', '--no-ext-diff', '--no-renames', base, target, '--', ...safe], { binary: true });
      const apply = spawnSync('git', ['apply', '--check', '--binary', '-'], {
        cwd: dir, input: patch, maxBuffer: 64 * 1024 * 1024,
      });
      if (apply.error || apply.status !== 0) throw new Error('PATCH_CHECK_FAILED');
      git(['apply', '--binary', '-'], { cwd: dir, input: patch });
    }
    mkdirSync(resolve(dir, '.elus-integrator'), { recursive: true });
    writeFileSync(resolve(dir, '.elus-integrator', 'report.json'), JSON.stringify({
      ...report, preparedFiles: safe, note: 'Código preparado sem commit. Protected/conflicts requerem revisão.',
    }, null, 2) + '\n');
    return { output: dir, preparedFiles: safe.length, totals: report.totals };
  } catch (error) {
    // Não descarta worktree após erro: permite inspeção sem perder artefatos.
    throw new Error('PREPARE_INCOMPLETE_AT_' + dir + ': ' + String(error.message ?? error));
  }
}

function parseArgs(argv) {
  const [mode, ...args] = argv;
  if (!['plan', 'prepare'].includes(mode)) throw new Error('USAGE: plan|prepare --base SHA40 --target SHA40 [--out ABSOLUTE_PATH]');
  const opts = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--base', '--target', '--out'].includes(args[i]) || !args[i + 1] || opts[args[i]]) {
      throw new Error('INVALID_ARGUMENTS');
    }
    opts[args[i].slice(2)] = args[i + 1];
  }
  if (!opts.base || !opts.target) throw new Error('PIN_REQUIRED');
  if (mode === 'plan' && opts.out) throw new Error('OUT_ONLY_FOR_PREPARE');
  if (mode === 'prepare' && !opts.out) throw new Error('OUTPUT_REQUIRED');
  return { mode, ...opts };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const a = parseArgs(process.argv.slice(2));
    const answer = a.mode === 'plan' ? classify(a.base, a.target) : prepare(a.base, a.target, a.out);
    console.log(JSON.stringify(answer, null, 2));
  } catch (error) {
    console.error('INTEGRATOR_NO_GO: ' + String(error.message ?? error));
    process.exitCode = 1;
  }
}
