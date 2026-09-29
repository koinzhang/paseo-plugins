import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { resolveProject } from "./project-key.ts";

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", ["-C", cwd, ...args], { stdio: "ignore" });
}

function withDir(run: (dir: string) => Promise<void>): () => Promise<void> {
  return async () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "inbox-project-")));
    try {
      await run(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

function initRepo(dir: string): void {
  git(dir, "init", "-q");
  git(dir, "-c", "user.email=t@t", "-c", "user.name=t", "commit", "-q", "--allow-empty", "-m", "init");
}

test(
  "origin remote wins, and a worktree shares the key",
  withDir(async (dir) => {
    const repo = join(dir, "repo");
    mkdirSync(repo);
    initRepo(repo);
    git(repo, "remote", "add", "origin", "git@github.com:acme/app.git");
    git(repo, "worktree", "add", "-q", join(dir, "wt"));
    const expected = { key: "remote:github.com/acme/app", label: "app" };
    assert.deepEqual(await resolveProject(repo), expected);
    assert.deepEqual(await resolveProject(join(dir, "wt")), expected);
  }),
);

test(
  "a non-origin remote is used when origin is missing",
  withDir(async (dir) => {
    initRepo(dir);
    git(dir, "remote", "add", "upstream", "https://gitlab.com/acme/lib.git");
    assert.equal((await resolveProject(dir)).key, "remote:gitlab.com/acme/lib");
  }),
);

test(
  "without a remote the repository root is the key, even from a subdirectory",
  withDir(async (dir) => {
    initRepo(dir);
    const sub = join(dir, "src", "deep");
    mkdirSync(sub, { recursive: true });
    assert.equal((await resolveProject(sub)).key, `path:${dir}`);
  }),
);

test(
  "outside git the directory itself is the key",
  withDir(async (dir) => {
    assert.equal((await resolveProject(dir)).key, `path:${dir}`);
  }),
);
