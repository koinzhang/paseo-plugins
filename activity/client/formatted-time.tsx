import type { ReactNode } from "react";
import { Text, type TextStyle } from "react-native";
import { formatActivityTime } from "../shared/format.ts";
import { useAppLanguage } from "./use-app-language.ts";

/**
 * ISO timestamp with app language (fallback `en`) + Intl locale style.
 * Today → time only; same year → month/day + time; otherwise includes the year.
 */
export function FormattedTime({
  iso,
  style,
  format,
}: {
  iso: string | null | undefined;
  style?: TextStyle;
  /** Wraps the stamp in localized copy, e.g. `messages.common.lastUsed`. */
  format?: (stamp: string) => string;
}): ReactNode {
  const locale = useAppLanguage();
  const stamp = formatActivityTime(iso, locale);
  return <Text style={style}>{format ? format(stamp) : stamp}</Text>;
}
