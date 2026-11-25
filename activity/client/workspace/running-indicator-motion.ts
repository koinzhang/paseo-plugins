export function shouldUseNativeDriver(platform: string): boolean {
  return platform !== "web";
}
