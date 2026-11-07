# Start here

Welcome to the [More Events](https://github.com/mnaoumov/obsidian-more-events/) demo vault. This plugin has no user interface at all: it is a home for the events Obsidian does not publish, named and typed, on `app.workspace`, for other plugins to subscribe to. If you are reading this as a user, the honest summary is that another plugin asked you to install it.

**The first set is plugin lifecycle** — beginning with four events that let a plugin notice a **core** plugin — Backlinks, Canvas, Graph, any of them — or a **community** plugin being enabled or disabled. It is where the plugin started rather than where it stops. **The second set is context menus**, beginning with the **Bookmarks** view: Obsidian builds many context menus without an event a plugin could add an item from. **The third set is files**: an event for a newly created file once it holds its content, which Obsidian's own `create` does not promise. **The fourth set is the canvas**: its selection, its content, its read-only state and a card's editing state changing, and its selection toolbar being built. **The fifth set is tasks**: a task's checkbox being clicked, in Reading view as well as in Live Preview. **The sixth set is commands**: a command dispatched by Obsidian. File events also include before/after text saves and indexed frontmatter diffs. **The seventh set is the workspace**: tab closure and visibility, Markdown mode changes and completed Reading-view rendering passes. Index readiness has its own signal too, and plugin lifecycle now also includes installed community-plugin removal. **The eighth set is configuration**: a native vault configuration key changing. **The ninth set is Sync**: the vault's Sync state changing, idle included.

If you are reading it as a plugin developer, this vault is the documentation. Every note has buttons you can click here in Obsidian, so the events are something you watch arrive rather than something you take on trust.

**How to try it:** open [01 Core plugin events](<./01 Core plugin events.md>), press its listen button, and toggle a core plugin in **Settings -> Core plugins**. A notice appears for each change.

## Features

- [01 Core plugin events](<./01 Core plugin events.md>)
- [02 Community plugin events](<./02 Community plugin events.md>)
- [03 For plugin developers](<./03 For plugin developers.md>)
- [04 Context menu events](<./04 Context menu events.md>)
- [05 Why it patches](<./05 Why it patches.md>)
- [06 File events](<./06 File events.md>)
- [07 Canvas events](<./07 Canvas events.md>)
- [08 Task events](<./08 Task events.md>)
- [09 Command events](<./09 Command events.md>)

- [10 Workspace events](<./10 Workspace events.md>)
- [11 Index readiness](<./11 Index readiness.md>)

- [12 Configuration events](<./12 Configuration events.md>)
- [13 Sync events](<./13 Sync events.md>)
- [14 Mobile keyboard events](<./14 Mobile keyboard events.md>)
