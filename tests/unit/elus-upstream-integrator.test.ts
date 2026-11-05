import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const script = resolve(process.cwd(), 'scripts/elus-upstream-integrator.mjs');
const created: string[] = [];
function git(root: string, ...args: string[]) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}
function put(root: string, name: string, content: string) {
  mkdirSync(join(root, name, '..'), { recursive: true });
  writeFileSync(join(root, name), content);
}
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'elus-integrator-'));
  created.push(root);
  git(root, 'init');
  git(root, 'config', 'user.name', 'Test');
  git(root, 'config', 'user.email', 'test@example.invalid');
  put(root, 'app/a.ts', 'export const a = 1;\n');
  put(root, 'app/custom.ts', 'export const value = 1;\n');
  put(root, 'supabase/migrations/initial.sql', '-- original\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'base');
  const base = git(root, 'rev-parse', 'HEAD');
  git(root, 'switch', '-c', 'upstream');
  put(root, 'app/a.ts', 'export const a = 2;\n');
  put(root, 'app/custom.ts', 'export const value = 2;\n');
  put(root, 'supabase/migrations/initial.sql', '-- changed upstream\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'upstream');
  const target = git(root, 'rev-parse', 'HEAD');
  git(root, 'switch', '-c', 'elus', base);
  put(root, 'app/custom.ts', 'export const value = 999;\n');
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'local customization');
  return { root, base, target };
}
function run(root: string, ...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8' });
}
afterEach(() => {
  for (const p of created.splice(0)) rmSync(p, { recursive: true, force: true });
});

describe('ELUS upstream integrator: isolated executable preparation', () => {
  it('classifies clean changes, ELUS conflicts and protected SQL without modification', () => {
    const { root, base, target } = fixture();
    const previousHead = git(root, 'rev-parse', 'HEAD');
    const r = run(root, 'plan', '--base', base, '--target', target);
    expect(r.status).toBe(0);
    const report = JSON.parse(r.stdout);
    expect(report.results).toEqual(expect.arrayContaining([
      { path: 'app/a.ts', status: 'safe_to_prepare' },
      { path: 'app/custom.ts', status: 'conflict_requires_review' },
      { path: 'supabase/migrations/initial.sql', status: 'protected' },
    ]));
    expect(git(root, 'rev-parse', 'HEAD')).toBe(previousHead);
    expect(git(root, 'status', '--porcelain')).toBe('');
  });

  it('prepares only nonconflicting code in a detached worktree without commit or SQL writes', () => {
    const { root, base, target } = fixture();
    const output = root + '-prepared';
    created.push(output);
    const originalHead = git(root, 'rev-parse', 'HEAD');
    const r = run(root, 'prepare', '--base', base, '--target', target, '--out', output);
    expect(r.status, r.stderr).toBe(0);
    expect(readFileSync(join(output, 'app/a.ts'), 'utf8')).toContain('a = 2');
    expect(readFileSync(join(output, 'app/custom.ts'), 'utf8')).toContain('999');
    expect(readFileSync(join(output, 'supabase/migrations/initial.sql'), 'utf8')).toBe('-- original\n');
    expect(existsSync(join(output, '.elus-integrator/report.json'))).toBe(true);
    expect(git(root, 'rev-parse', 'HEAD')).toBe(originalHead);
    expect(git(root, 'status', '--porcelain')).toBe('');
    git(root, 'worktree', 'remove', '--force', output);
  });

  it('fails closed without SHA pins and refuses existing output paths', () => {
    const { root, base, target } = fixture();
    expect(run(root, 'plan', '--base', 'v1.89.0', '--target', target).status).toBe(1);
    expect(run(root, 'prepare', '--base', base, '--target', target, '--out', root).status).toBe(1);
  });
});
