import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  collapseHomePath,
  expandHomePath,
  finalizeSkillPaths,
  resolveSkillMdPath,
} from "./skill-path.ts";

describe("collapseHomePath / expandHomePath", () => {
  it("round-trips ~/ paths", () => {
    const home = "/Users/koin";
    assert.equal(collapseHomePath("/Users/koin/.claude/skills/x/SKILL.md", home), "~/.claude/skills/x/SKILL.md");
    assert.equal(expandHomePath("~/.claude/skills/x/SKILL.md", home), "/Users/koin/.claude/skills/x/SKILL.md");
    assert.equal(collapseHomePath(home, home), "~");
    assert.equal(expandHomePath("~", home), home);
  });

  it("collapses case-insensitive home prefixes on macOS-style paths", () => {
    const home = "/Users/koin";
    assert.equal(
      collapseHomePath("/users/koin/WorkSpace/proj/.agents/skills/a/SKILL.md", home),
      "~/WorkSpace/proj/.agents/skills/a/SKILL.md",
    );
  });

  it("leaves non-home paths unchanged", () => {
    assert.equal(collapseHomePath("/opt/skills/x/SKILL.md", "/Users/koin"), "/opt/skills/x/SKILL.md");
  });
});

describe("resolveSkillMdPath / finalizeSkillPaths", () => {
  it("finds nested category skills and collapses home", () => {
    const root = mkdtempSync(join(tmpdir(), "tool-usage-skills-"));
    try {
      const skillDir = join(root, "info", "zhihu");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "# zhihu\n");

      const abs = resolveSkillMdPath("zhihu", [join(root)]);
      assert.equal(abs, join(skillDir, "SKILL.md"));

      const [item] = finalizeSkillPaths(
        [{ skillName: "zhihu", skillPath: null }],
        [join(root)],
        root,
      );
      assert.equal(item?.skillPath, "~/info/zhihu/SKILL.md");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
