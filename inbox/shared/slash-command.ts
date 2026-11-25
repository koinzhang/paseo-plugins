export interface InboxCommand {
  /** Empty: star the current agent; otherwise save as a note. */
  text: string;
}

/** The whole argument is note text as typed; there are no options. */
export function parseInboxCommand(args: string): InboxCommand {
  return { text: args.trim() };
}
