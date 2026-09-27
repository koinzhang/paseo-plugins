const FILE_MARKS: Record<string, string> = {
  md: "↓", markdown: "↓", txt: "≡", pdf: "PDF",
  ts: "TS", tsx: "TS", js: "JS", jsx: "JS", json: "{}",
  css: "#", scss: "#", html: "<>", xml: "<>", svg: "◇",
  yml: "⚙", yaml: "⚙", toml: "⚙", ini: "⚙", cfg: "⚙", conf: "⚙",
  sh: ">_", py: "Py", kt: "Kt", swift: "Sw", go: "Go", rs: "Rs",
  png: "▧", jpg: "▧", jpeg: "▧", gif: "▧", webp: "▧",
};

export function fileMark(fileName: string): string {
  const extension = fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() : undefined;
  return (extension && FILE_MARKS[extension]) || "▤";
}

/** Preserve the workspace root and the file name before dropping middle directories. */
export function shortenFilePath(path: string, maxLength = 32): string {
  if (path.length <= maxLength) return path;
  const parts = path.split("/");
  if (parts.length < 3) return path;
  const start = parts[0];
  const end = parts[parts.length - 1];
  const shortened = `${start}/…/${end}`;
  if (shortened.length <= maxLength) return shortened;
  const endLength = Math.max(8, maxLength - start.length - 3);
  return `${start}/…/…${end.slice(-endLength)}`;
}
