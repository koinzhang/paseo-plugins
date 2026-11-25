import { defineTranslations } from "@getpaseo/plugin/client";
import { messagesFor } from "../shared/i18n.ts";

const english = messagesFor("en");
const chinese = messagesFor("zh-CN");

export const customizeTranslations = defineTranslations({
  resources: {
    en: { title: english.title, openBoard: english.openBoard },
    "zh-CN": { title: chinese.title, openBoard: chinese.openBoard },
  },
});
