export interface InboxCommand {
  /** Save into the current workspace's Inbox instead of the global one. */
  workspace: boolean;
  /** Empty: star the current agent; otherwise save as scratch. */
  text: string;
}

const WORKSPACE_FLAGS = new Set(["-w", "--workspace"]);

function firstToken(value: string): string {
  const space = value.search(/\s/);
  return space === -1 ? value : value.slice(0, space);
}

/**
 * Only a leading `-w` / `--workspace` is an option; anything else is scratch text as typed.
 * A leading `--` ends options so the text itself may start with `-w`.
 */
export function parseInboxCommand(args: string): InboxCommand {
  let rest = args.trim();
  let workspace = false;
  let head = firstToken(rest);
  if (WORKSPACE_FLAGS.has(head)) {
    workspace = true;
    rest = rest.slice(head.length).trim();
    head = firstToken(rest);
  }
  if (head === "--") rest = rest.slice(2).trim();
  return { workspace, text: rest };
}
