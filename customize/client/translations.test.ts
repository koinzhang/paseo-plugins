import assert from "node:assert/strict";
import { test } from "node:test";
import { messagesFor, resolveAppLanguage } from "../shared/i18n.ts";
import { customizeTranslations } from "./translations.ts";

test("SDK command resources preserve Customize titles and slash descriptions", () => {
  for (const locale of ["en", "zh-CN"] as const) {
    const messages = messagesFor(locale);
    assert.deepEqual(customizeTranslations.resources[locale], {
      title: messages.title,
      openBoard: messages.openBoard,
    });
    assert.equal(messages.title, "Customize");
  }
});

test("command labels are immutable SDK messages rather than a captured language string", () => {
  for (const key of ["title", "openBoard"] as const) {
    const message = customizeTranslations.message(key);
    assert.equal(typeof message, "object");
    assert.equal(Object.isFrozen(message), true);
  }
});

test("resolved host locales keep the existing board catalog and English fallback", () => {
  assert.equal(resolveAppLanguage("zh-CN"), "zh-CN");
  assert.equal(resolveAppLanguage("zh-Hans-CN"), "zh-CN");
  assert.equal(resolveAppLanguage("en-US"), "en");
  assert.equal(resolveAppLanguage("fr-FR"), "en");
});
