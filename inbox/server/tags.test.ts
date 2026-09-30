import assert from "node:assert/strict";
import { test } from "node:test";
import type { Directory } from "./directory.ts";
import { resolveTags } from "./tags.ts";

const repo = { key: "remote:github.com/a/repo", label: "a/repo" };
const other = { key: "remote:github.com/a/other", label: "a/other" };
const directory: Directory = {
  projects: new Map([
    [repo.key, repo.label],
    [other.key, other.label],
  ]),
  workspaces: new Map([
    ["w1", { label: "main", project: repo }],
    ["w2", { label: "feat", project: other }],
  ]),
};
const untagged = { projectKey: null, projectLabel: null, workspaceId: null, workspaceLabel: null };

test("a workspace alone brings its project", () => {
  assert.deepEqual(resolveTags(untagged, { projectKey: null, workspaceId: "w1" }, directory), {
    project: repo,
    workspace: { id: "w1", label: "main" },
  });
});

test("a workspace of another project is rejected", () => {
  assert.throws(
    () => resolveTags(untagged, { projectKey: repo.key, workspaceId: "w2" }, directory),
    /belongs to another project/,
  );
});

test("a project alone, or nothing, clears the workspace", () => {
  assert.deepEqual(resolveTags(untagged, { projectKey: other.key, workspaceId: null }, directory), {
    project: other,
    workspace: null,
  });
  assert.deepEqual(resolveTags(untagged, { projectKey: null, workspaceId: null }, directory), {
    project: null,
    workspace: null,
  });
});

test("archived tags can be kept but not newly picked", () => {
  const archived = {
    projectKey: "path:/gone",
    projectLabel: "gone",
    workspaceId: "w-gone",
    workspaceLabel: "old",
  };
  assert.deepEqual(resolveTags(archived, { projectKey: "path:/gone", workspaceId: "w-gone" }, directory), {
    project: { key: "path:/gone", label: "gone" },
    workspace: { id: "w-gone", label: "old" },
  });
  assert.deepEqual(resolveTags(archived, { projectKey: "path:/gone", workspaceId: null }, directory), {
    project: { key: "path:/gone", label: "gone" },
    workspace: null,
  });
  assert.throws(() => resolveTags(untagged, { projectKey: null, workspaceId: "w-gone" }, directory), /archived/);
  assert.throws(() => resolveTags(untagged, { projectKey: "path:/gone", workspaceId: null }, directory), /archived/);
  assert.throws(
    () => resolveTags(archived, { projectKey: repo.key, workspaceId: "w-gone" }, directory),
    /belongs to another project/,
  );
});
