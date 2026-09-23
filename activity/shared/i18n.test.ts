import assert from "node:assert/strict";
import test from "node:test";
import { formatDuration } from "./format.ts";
import { messagesFor, resolveAppLanguage } from "./i18n.ts";

test("resolveAppLanguage honors an explicit Paseo setting", () => {
  assert.equal(resolveAppLanguage("zh-CN", ["en-US"]), "zh-CN");
  assert.equal(resolveAppLanguage("ja", ["zh-CN"]), "ja");
});

test("resolveAppLanguage maps system to the OS preference", () => {
  assert.equal(resolveAppLanguage("system", ["zh-TW", "en"]), "zh-CN");
  assert.equal(resolveAppLanguage("system", ["pt-PT"]), "pt-BR");
  assert.equal(resolveAppLanguage("system", ["de-DE", "ko-KR"]), "ko");
  assert.equal(resolveAppLanguage("system", ["de-DE"]), "en");
});

test("resolveAppLanguage treats missing or unknown settings like system", () => {
  assert.equal(resolveAppLanguage(undefined, []), "en");
  assert.equal(resolveAppLanguage("klingon", ["zh-CN"]), "zh-CN");
});

test("messagesFor returns zh-CN copy and falls back to English", () => {
  assert.equal(messagesFor("zh-CN").common.retry, "重试");
  assert.equal(messagesFor("zh-CN").common.lastUsed("3 分钟前"), "最近 3 分钟前");
  assert.equal(messagesFor("fr").common.retry, messagesFor("en").common.retry);
  assert.equal(messagesFor("en").workspace.state.subagents(1), "1 subagent");
  assert.equal(messagesFor("en").workspace.state.subagents(2), "2 subagents");
});

test("formatDuration uses the locale's units", () => {
  assert.equal(formatDuration(5 * 60_000, "en"), "5 min");
  assert.equal(formatDuration(5 * 60_000, "zh-CN"), "5 分钟");
});
