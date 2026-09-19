import { useSyncExternalStore } from "react";
import { Platform } from "react-native";
import { readAppLanguage, subscribeAppLanguage } from "./web.ts";

const defaultLanguage = () => "en";
const noSubscription = () => () => {};

export function useAppLanguage(): string {
  return useSyncExternalStore(
    Platform.OS === "web" ? subscribeAppLanguage : noSubscription,
    Platform.OS === "web" ? readAppLanguage : defaultLanguage,
    defaultLanguage,
  );
}
