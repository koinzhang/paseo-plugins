import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { messagesFor, type Messages } from "../shared/i18n.ts";
import { readAppLanguage, subscribeAppLanguage } from "./web.ts";

const defaultLanguage = () => "en";
const noSubscription = () => () => {};

/** Paseo app language (Settings → Language, `system` → OS preference); `en` off web. */
export function useAppLanguage(): string {
  return useSyncExternalStore(
    Platform.OS === "web" ? subscribeAppLanguage : noSubscription,
    Platform.OS === "web" ? readAppLanguage : defaultLanguage,
    defaultLanguage,
  );
}

/** UI copy for the current app language (066). */
export function useMessages(): Messages {
  return messagesFor(useAppLanguage());
}

/** Non-React read for registrations (Command Center titles, pill titles). */
export function currentAppLanguage(): string {
  return Platform.OS === "web" ? readAppLanguage() : "en";
}

/** Non-React subscription; no-op off web. */
export function watchAppLanguage(onChange: () => void): () => void {
  return Platform.OS === "web" ? subscribeAppLanguage(onChange) : () => {};
}
