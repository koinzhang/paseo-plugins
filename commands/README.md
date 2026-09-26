# Commands

Essential client-side slash commands for controlling the current Paseo agent.

Commands:

- `/model [model]` — show or switch the model
- `/effort [level]` — show or set thinking effort
- `/profile [profile]` — apply an agent profile's runtime settings (model, mode, effort, features)
- `/mode [mode]` — show or switch the mode
- `/feature [name] [value]` — show or set a provider feature
- `/rename <title>` — rename the agent
- `/cancel` — cancel the running turn
- `/resend [text]` — resend the latest non-empty user prompt, appending any text on a new line

Options come from what the agent's provider reports; nothing is hardcoded. Without an argument,
a command opens a menu right away, anchored above the composer on desktop and as a sheet on
mobile, with the current choice checked. Input is matched case-insensitively by ID or label. An exact match wins, then a unique
prefix. Ambiguous input lists the candidates. `/resend` resends the latest prompt as text, appending
extra text after one newline.

Turn individual commands on or off in **Settings → Plugins → commands → Settings**. A disabled command disappears
from slash autocomplete, so the provider's own command of the same name (if any) takes over.

## Examples

```text
/model gpt-5.6-sol
/effort high
/feature fast_mode on
/profile reviewer
/rename Payment Review
/resend Also cover the empty input
```

## Install

```bash
paseo plugin add koinzhang/paseo-plugins --path commands
```

Requires Paseo >= 0.9.2. The plugin SDK cannot change agent settings yet, so the daemon side of
the plugin connects to its local daemon (`PASEO_LISTEN` or `$PASEO_HOME/paseo.pid`) and sends the
same requests the app uses. If the daemon requires a password, set `PASEO_PASSWORD` for it.
