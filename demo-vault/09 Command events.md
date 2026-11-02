# Command events

`More Events` announces commands dispatched by Obsidian's command manager, whether they came from a hotkey, the command palette, a menu or another plugin's `executeCommandById` call.

| Event | Fires when | Payload |
| --- | --- | --- |
| `more-events:command-executed` | synchronous command dispatch returns successfully | `{ id, name }` |

The payload is a copy of the command's qualified id and display name. The event fires after its synchronous callback returns. Obsidian does not await asynchronous callbacks, so this event does not promise their completion or success. Obsidian also reports successful dispatch when a `checkCallback` declines to act; the event preserves that meaning. Unknown command ids and dispatches that return failure are silent. Calling a command's callback directly bypasses the dispatcher and this event.

## Watch it arrive

Start listening, then run any command from the palette or its keyboard shortcut:

```code-button
---
caption: Listen for commands
---
require('/demoSetup.ts').startListeningToCommands(app);
```

This button dispatches Obsidian's Save command. It produces a command notice even when the note is clean; [save events](<./06 File events.md>) require changed content:

```code-button
---
caption: Dispatch Save
---
app.commands.executeCommandById('editor:save-file');
```

```code-button
---
caption: Stop listening for commands
---
require('/demoSetup.ts').stopListeningToCommands();
```
