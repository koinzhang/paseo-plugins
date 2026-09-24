/**
 * TOML subset for Codex `config.toml`: tables, arrays of tables, dotted and
 * quoted keys, basic / literal / multi-line strings, numbers, booleans,
 * (multi-line) arrays, and inline tables. Dates are kept as strings.
 */

type Table = Record<string, unknown>;

export function parseToml(source: string): Table {
  const root: Table = {};
  let current: Table = root;
  const p = new Parser(source.replace(/\r\n?/g, "\n"));
  for (;;) {
    p.skipWsAndComments(true);
    if (p.done()) break;
    if (p.peek() === "[") {
      const isArray = p.peek(1) === "[";
      p.pos += isArray ? 2 : 1;
      p.skipWs();
      const keys = p.readKeyPath();
      p.skipWs();
      p.expect(isArray ? "]]" : "]");
      current = isArray ? appendArrayTable(root, keys) : ensureTable(root, keys);
    } else {
      const keys = p.readKeyPath();
      p.skipWs();
      p.expect("=");
      p.skipWs();
      const value = p.readValue();
      const parent = ensureTable(current, keys.slice(0, -1));
      parent[keys[keys.length - 1]!] = value;
    }
    p.skipLineRest();
  }
  return root;
}

function ensureTable(root: Table, keys: string[]): Table {
  let node = root;
  for (const key of keys) {
    const existing = node[key];
    if (Array.isArray(existing)) {
      const last = existing[existing.length - 1];
      node = (typeof last === "object" && last !== null ? last : {}) as Table;
    } else if (typeof existing === "object" && existing !== null) {
      node = existing as Table;
    } else {
      const next: Table = {};
      node[key] = next;
      node = next;
    }
  }
  return node;
}

function appendArrayTable(root: Table, keys: string[]): Table {
  const parent = ensureTable(root, keys.slice(0, -1));
  const key = keys[keys.length - 1]!;
  const list = Array.isArray(parent[key]) ? (parent[key] as unknown[]) : [];
  parent[key] = list;
  const table: Table = {};
  list.push(table);
  return table;
}

class Parser {
  pos = 0;
  private readonly src: string;

  constructor(src: string) {
    this.src = src;
  }

  done() {
    return this.pos >= this.src.length;
  }

  peek(offset = 0) {
    return this.src[this.pos + offset];
  }

  expect(token: string) {
    if (!this.src.startsWith(token, this.pos)) throw new Error(`TOML: expected ${token} at ${this.pos}`);
    this.pos += token.length;
  }

  skipWs() {
    while (this.peek() === " " || this.peek() === "\t") this.pos++;
  }

  skipWsAndComments(newlines: boolean) {
    for (;;) {
      const ch = this.peek();
      if (ch === " " || ch === "\t" || (newlines && ch === "\n")) this.pos++;
      else if (ch === "#") while (!this.done() && this.peek() !== "\n") this.pos++;
      else break;
    }
  }

  skipLineRest() {
    this.skipWsAndComments(false);
    if (this.peek() === "\n") this.pos++;
    else if (!this.done()) while (!this.done() && this.peek() !== "\n") this.pos++;
  }

  readKeyPath(): string[] {
    const keys = [this.readKey()];
    for (;;) {
      this.skipWs();
      if (this.peek() !== ".") break;
      this.pos++;
      this.skipWs();
      keys.push(this.readKey());
    }
    return keys;
  }

  readKey(): string {
    const ch = this.peek();
    if (ch === '"') return this.readBasicString();
    if (ch === "'") return this.readLiteralString();
    const start = this.pos;
    while (!this.done() && /[A-Za-z0-9_-]/.test(this.peek()!)) this.pos++;
    if (start === this.pos) throw new Error(`TOML: bad key at ${this.pos}`);
    return this.src.slice(start, this.pos);
  }

  readValue(): unknown {
    const ch = this.peek();
    if (this.src.startsWith('"""', this.pos)) return this.readMultiline('"""', true);
    if (this.src.startsWith("'''", this.pos)) return this.readMultiline("'''", false);
    if (ch === '"') return this.readBasicString();
    if (ch === "'") return this.readLiteralString();
    if (ch === "[") return this.readArray();
    if (ch === "{") return this.readInlineTable();
    const start = this.pos;
    while (!this.done() && !/[,\]}\n#]/.test(this.peek()!)) this.pos++;
    const raw = this.src.slice(start, this.pos).trim();
    if (raw === "true") return true;
    if (raw === "false") return false;
    const num = Number(raw.replace(/_/g, ""));
    return raw !== "" && Number.isFinite(num) ? num : raw;
  }

  readBasicString(): string {
    this.pos++;
    let out = "";
    while (!this.done() && this.peek() !== '"') {
      const ch = this.peek()!;
      if (ch === "\\") {
        out += this.readEscape();
      } else {
        out += ch;
        this.pos++;
      }
    }
    this.pos++;
    return out;
  }

  readEscape(): string {
    this.pos++;
    const ch = this.peek()!;
    this.pos++;
    const map: Record<string, string> = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", '"': '"', "\\": "\\" };
    if (ch in map) return map[ch]!;
    if (ch === "u" || ch === "U") {
      const len = ch === "u" ? 4 : 8;
      const hex = this.src.slice(this.pos, this.pos + len);
      this.pos += len;
      return String.fromCodePoint(parseInt(hex, 16));
    }
    return ch;
  }

  readLiteralString(): string {
    this.pos++;
    const end = this.src.indexOf("'", this.pos);
    const out = this.src.slice(this.pos, end < 0 ? undefined : end);
    this.pos = end < 0 ? this.src.length : end + 1;
    return out;
  }

  readMultiline(delim: string, escapes: boolean): string {
    this.pos += 3;
    if (this.peek() === "\n") this.pos++;
    let out = "";
    while (!this.done() && !this.src.startsWith(delim, this.pos)) {
      if (escapes && this.peek() === "\\") {
        if (/^\\[ \t]*\n/.test(this.src.slice(this.pos, this.pos + 64))) {
          this.pos++;
          while (/[ \t\n]/.test(this.peek() ?? "")) this.pos++;
          continue;
        }
        out += this.readEscape();
      } else {
        out += this.peek();
        this.pos++;
      }
    }
    this.pos += 3;
    return out;
  }

  readArray(): unknown[] {
    this.pos++;
    const out: unknown[] = [];
    for (;;) {
      this.skipWsAndComments(true);
      if (this.peek() === "]") {
        this.pos++;
        return out;
      }
      if (this.done()) return out;
      out.push(this.readValue());
      this.skipWsAndComments(true);
      if (this.peek() === ",") this.pos++;
    }
  }

  readInlineTable(): Table {
    this.pos++;
    const out: Table = {};
    for (;;) {
      this.skipWsAndComments(true);
      if (this.peek() === "}") {
        this.pos++;
        return out;
      }
      if (this.done()) return out;
      const keys = this.readKeyPath();
      this.skipWs();
      this.expect("=");
      this.skipWs();
      ensureTable(out, keys.slice(0, -1))[keys[keys.length - 1]!] = this.readValue();
      this.skipWsAndComments(true);
      if (this.peek() === ",") this.pos++;
    }
  }
}
