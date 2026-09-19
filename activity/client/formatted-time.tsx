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
  prefix,
}: {
  iso: string | null | undefined;
  style?: TextStyle;
  /** e.g. `"Last "` — concatenated before the stamp */
  prefix?: string;
}): ReactNode {
  const locale = useAppLanguage();
  const stamp = formatActivityTime(iso, locale);
  return <Text style={style}>{prefix ? `${prefix}${stamp}` : stamp}</Text>;
}
