/** Glob → RegExp: `**`, `*`, `?`, `{a,b}`, and `[...]` classes. */
export function globToRegExp(glob: string): RegExp {
  let out = "";
  let braces = 0;
  for (let i = 0; i < glob.length; i++) {
    const ch = glob[i]!;
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        const slashAfter = glob[i + 2] === "/";
        out += slashAfter ? "(?:.*/)?" : ".*";
        i += slashAfter ? 2 : 1;
      } else {
        out += "[^/]*";
      }
    } else if (ch === "?") {
      out += "[^/]";
    } else if (ch === "{") {
      braces++;
      out += "(?:";
    } else if (ch === "}" && braces > 0) {
      braces--;
      out += ")";
    } else if (ch === "," && braces > 0) {
      out += "|";
    } else if (ch === "[") {
      const end = glob.indexOf("]", i + 1);
      if (end < 0) {
        out += "\\[";
      } else {
        out += `[${glob.slice(i + 1, end).replace(/^!/, "^").replace(/\\/g, "\\\\")}]`;
        i = end;
      }
    } else {
      out += /[.+^$()|\\/]/.test(ch) ? `\\${ch}` : ch;
    }
  }
  return new RegExp(`^${out}$`);
}

export function matchGlob(glob: string, value: string): boolean {
  try {
    return globToRegExp(glob).test(value);
  } catch {
    return false;
  }
}
