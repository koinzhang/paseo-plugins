import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { messagesFor, type AppLanguage, type Messages } from "../shared/i18n.ts";
import { readAppLanguage, subscribeAppLanguage } from "./web.ts";

const defaultLanguage = (): AppLanguage => "en";
const noSubscription = () => () => {};

/** Paseo app language (Settings → Language, `system` → OS preference); `en` off web. */
export function useAppLanguage(): AppLanguage {
  return useSyncExternalStore(
    Platform.OS === "web" ? subscribeAppLanguage : noSubscription,
    Platform.OS === "web" ? readAppLanguage : defaultLanguage,
    defaultLanguage,
  );
}

export function useMessages(): Messages {
  return messagesFor(useAppLanguage());
}

export function currentAppLanguage(): AppLanguage {
  return Platform.OS === "web" ? readAppLanguage() : "en";
}

export function watchAppLanguage(onChange: () => void): () => void {
  return Platform.OS === "web" ? subscribeAppLanguage(onChange) : () => {};
}
