export interface InboxCommand {
  /** Empty: star the current agent; otherwise save as scratch. */
  text: string;
}

/** The whole argument is scratch text as typed; there are no options. */
export function parseInboxCommand(args: string): InboxCommand {
  return { text: args.trim() };
}
