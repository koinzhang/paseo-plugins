import type { Confidence } from "./classify.ts";

type ShellToken = { value: string; separator: boolean };
export type SkillReadEvidence = { filePath: string; confidence: Confidence };

function shellTokens(command: string): ShellToken[] | null {
  const tokens: ShellToken[] = [];
  let value = "";
  let active = false;
  let quote = "";
  const flush = () => {
    if (active) tokens.push({ value, separator: false });
    value = "";
    active = false;
  };
  for (let index = 0; index < command.length; index += 1) {
    const char = command[index]!;
    if (quote) {
      if (char === quote) quote = "";
      else if (char === "\\" && quote === '"' && /["\\$`]/.test(command[index + 1] ?? "")) {
        const escaped = command[++index]!;
        value += escaped === "$" ? "\u0001" : escaped;
      } else value += char === "$" && quote === "'" ? "\u0001" : char;
    } else if (char === "'" || char === '"') {
      quote = char;
      active = true;
    } else if (char === "\\") {
      const escaped = command[++index];
      if (escaped === undefined) return null;
      if (escaped !== "\n") value += escaped === "$" ? "\u0001" : escaped;
      active = true;
    } else if (char === "#" && !active) {
      while (index + 1 < command.length && command[index + 1] !== "\n") index += 1;
    } else if (";|&\n()<>".includes(char)) {
      flush();
      tokens.push({ value: char, separator: true });
    } else if (/\s/.test(char)) flush();
    else {
      value += char;
      active = true;
    }
  }
  if (quote) return null;
  flush();
  return tokens;
}

function expandVariables(value: string, variables: ReadonlyMap<string, string>): string {
  return value.replace(/\$(?:\{([A-Za-z_][\w]*)\}|([A-Za-z_][\w]*))/g, (original, braced, plain) =>
    variables.get(braced ?? plain) ?? original,
  );
}

function isLiteral(value: string): boolean {
  return !/[$`*?{}\u0001]/.test(value);
}

export function shellSkillReads(command: string, homeDir?: string): SkillReadEvidence[] {
  const evidence: SkillReadEvidence[] = [];
  const tokens = shellTokens(command);
  if (!tokens) return weakSkillPaths(command);
  const variables = new Map<string, string>();
  if (homeDir) variables.set("HOME", homeDir);
  const unsafe = /<<|\$\(|`|\b\w+\s*\(\s*\)\s*\{/.test(command) || tokens.some((token) =>
    !token.separator && ["if", "while", "until", "case", "function", "eval"].includes(token.value),
  );
  let budget = 256;

  function scan(parts: readonly ShellToken[], scope: Map<string, string>): void {
    let position = 0;
    while (position < parts.length && budget > 0) {
      if (parts[position]!.separator) {
        position += 1;
        continue;
      }
      if (parts[position]!.value === "for" && parts[position + 2]?.value === "in") {
        const variable = parts[position + 1]!.value;
        const listEnd = parts.findIndex((token, index) => index > position + 2 && token.separator);
        let bodyStart = listEnd + 1;
        while (parts[bodyStart]?.separator) bodyStart += 1;
        let bodyEnd = bodyStart + 1;
        while (bodyEnd < parts.length && parts[bodyEnd]!.value !== "done") bodyEnd += 1;
        const values = parts.slice(position + 3, listEnd).map((token) => expandVariables(token.value, scope));
        if (/^[A-Za-z_]\w*$/.test(variable) && listEnd >= 0 && parts[bodyStart]?.value === "do" &&
            bodyEnd < parts.length && values.every(isLiteral) &&
            !parts.slice(bodyStart + 1, bodyEnd).some((token) => ["for", "if", "while", "case", "function"].includes(token.value))) {
          for (const entry of values) {
            budget -= 1;
            if (budget <= 0) break;
            scan(parts.slice(bodyStart + 1, bodyEnd), new Map([...scope, [variable, entry]]));
          }
          position = bodyEnd + 1;
          continue;
        }
      }
      let end = position;
      while (end < parts.length && !parts[end]!.separator) end += 1;
      const words = parts.slice(position, end).map((token) => expandVariables(token.value, scope));
      let executable = 0;
      while (/^[A-Za-z_]\w*=/.test(words[executable] ?? "")) {
        const assignment = words[executable]!;
        const split = assignment.indexOf("=");
        if (words.length === executable + 1 && isLiteral(assignment.slice(split + 1))) {
          scope.set(assignment.slice(0, split), assignment.slice(split + 1));
        }
        executable += 1;
      }
      const tool = words[executable]?.split("/").at(-1);
      const argumentsList = words.slice(executable + 1);
      const printsSed = tool === "sed" && argumentsList.some((argument) => argument === "-n") &&
        argumentsList.some((argument) => /p(?:\s|;|$)/.test(argument)) &&
        !argumentsList.some((argument) => /^-.*i/.test(argument));
      const reads = ["cat", "head", "bat"].includes(tool ?? "") || printsSed;
      const searches = ["rg", "grep"].includes(tool ?? "");
      if (reads || searches || tool === "sed") {
        for (const path of argumentsList) {
          if (!/\/SKILL\.md$/i.test(path)) continue;
          evidence.push({
            filePath: path.replace(/\u0001/g, "$"),
            confidence: reads && !unsafe && isLiteral(path) ? "inferred" : "low",
          });
        }
      }
      position = end;
    }
  }
  scan(tokens, variables);
  return evidence.length > 0 ? evidence : weakSkillPaths(command);
}

function weakSkillPaths(command: string): SkillReadEvidence[] {
  if (!/\b(cat|sed|head|bat|grep|rg)\b/.test(command)) return [];
  return [...command.matchAll(/[^\s'";|&()<>]+\/SKILL\.md\b/gi)]
    .map((match) => ({ filePath: match[0], confidence: "low" }));
}

export function codeModeSkillReads(code: string): SkillReadEvidence[] {
  const evidence: SkillReadEvidence[] = [];
  const calls = /\b(?:tools\.)?(read|bash)\s*\(\s*\{\s*(?:path|command)\s*:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
  for (const match of code.matchAll(calls)) {
    let literal: string;
    try {
      literal = match[2]!.startsWith('"') ? JSON.parse(match[2]!) : match[2]!.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, "\\");
    } catch {
      continue;
    }
    if (match[1] === "read") evidence.push({ filePath: literal, confidence: "low" });
    else evidence.push(...shellSkillReads(literal).map((entry) => ({ ...entry, confidence: "low" as const })));
  }
  return evidence;
}
