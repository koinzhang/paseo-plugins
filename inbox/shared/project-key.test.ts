import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeRemoteUrl, pathProject, remoteProject } from "./project-key.ts";

test("SSH, HTTPS and scp remotes of one repo normalize to the same value", () => {
  const expected = "github.com/koinzhang/paseo-plugins";
  for (const url of [
    "git@github.com:koinzhang/paseo-plugins.git",
    "https://github.com/koinzhang/paseo-plugins.git",
    "https://user:token@GitHub.com/koinzhang/paseo-plugins/",
    "ssh://git@github.com:22/koinzhang/paseo-plugins.git",
    "git://github.com/koinzhang/paseo-plugins",
  ]) {
    assert.equal(normalizeRemoteUrl(url), expected, url);
  }
});

test("nested group paths are kept", () => {
  assert.equal(normalizeRemoteUrl("git@gitlab.com:group/sub/repo.git"), "gitlab.com/group/sub/repo");
});

test("local and malformed remotes return null", () => {
  assert.equal(normalizeRemoteUrl("/srv/git/repo.git"), null);
  assert.equal(normalizeRemoteUrl("file:///srv/git/repo.git"), null);
  assert.equal(normalizeRemoteUrl("repo"), null);
  assert.equal(normalizeRemoteUrl("  "), null);
});

test("project refs carry a key prefix and a short label", () => {
  assert.deepEqual(remoteProject("github.com/a/b"), { key: "remote:github.com/a/b", label: "b" });
  assert.deepEqual(pathProject("/Users/me/code/app/"), { key: "path:/Users/me/code/app", label: "app" });
});
