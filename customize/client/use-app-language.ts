import { useTranslation } from "@getpaseo/plugin/client";
import { messagesFor, resolveAppLanguage, type AppLanguage, type Messages } from "../shared/i18n.ts";
import { customizeTranslations } from "./translations.ts";

export function useAppLanguage(): AppLanguage {
  const { locale } = useTranslation(customizeTranslations);
  return resolveAppLanguage(locale);
}

export function useMessages(): Messages {
  return messagesFor(useAppLanguage());
}
