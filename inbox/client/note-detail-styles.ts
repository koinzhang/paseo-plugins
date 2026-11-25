export function noteFieldFocusBorder({
  borderless,
  focused,
}: {
  borderless: boolean;
  focused: boolean;
}): boolean {
  return focused && !borderless;
}

export function noteActionOpacity(disabled: boolean): number {
  return disabled ? 0.5 : 1;
}
