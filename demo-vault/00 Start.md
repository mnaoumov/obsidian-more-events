# Start here

Welcome to the [More Events](https://github.com/mnaoumov/obsidian-more-events/) demo vault. This plugin has no user interface at all: it is a home for the events Obsidian does not publish, named and typed, on `app.workspace`, for other plugins to subscribe to. If you are reading this as a user, the honest summary is that another plugin asked you to install it.

**The first set is plugin lifecycle** — four events that let a plugin notice a **core** plugin — Backlinks, Canvas, Graph, any of them — or a **community** plugin being enabled or disabled. It is where the plugin started rather than where it stops. **The second set is context menus**, beginning with the **Bookmarks** view: Obsidian builds many context menus without an event a plugin could add an item from.

If you are reading it as a plugin developer, this vault is the documentation. Every note has buttons you can click here in Obsidian, so the events are something you watch arrive rather than something you take on trust.

**How to try it:** open [01 Core plugin events](<./01 Core plugin events.md>), press its listen button, and toggle a core plugin in **Settings -> Core plugins**. A notice appears for each change.

## Features

- [01 Core plugin events](<./01 Core plugin events.md>)
- [02 Community plugin events](<./02 Community plugin events.md>)
- [03 For plugin developers](<./03 For plugin developers.md>)
- [04 Context menu events](<./04 Context menu events.md>)
