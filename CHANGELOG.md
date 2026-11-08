# CHANGELOG

## 1.5.0

This release has 8 new features, 1 fix and 2 documentation changes. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### New

- **sync:** publish the Sync state event
- **context-menus:** publish the Sync status, Sync history and Publish file menus
- publish configuration and before-link events
- publish workspace, index and uninstall events
- publish save, command and frontmatter events
- add the more-events:task-checkbox-clicked event
- add the canvas selection, content, read-only, card editing and toolbar events
- add the more-events:new-file-ready event

### Fixed

- **deps:** clear the glob cancellation advisory with a glob 14 override

### Documentation

- make issue attachments optional and strongly encouraged
- link to the Obsidian resources page

## 1.4.0

This release has 2 new features and 3 documentation changes. 5 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### New

- add a Report a bug command
- publish canvas selection toolbar menu events

### Documentation

- **readme:** point bug reports at the Report a bug command
- add issue-filing instructions for AI agents
- record the 1.3.0 release of the context-menu events

## 1.3.0

This release has 17 new features, 2 fixes and 5 documentation changes. 5 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### New

- publish PDF toolbar menu events
- publish File Explorer root menu events
- announce the Bases view settings More options menu
- relay the canvas connection drop menu
- context-menu events for the history buttons and the plugin row's More options button
- relays of the canvas node, connection and selection menus
- relays of the Search results, note margin and Properties heading menus
- context-menu events for the vault name, and relays of leaf-menu and tab-group-menu
- context-menu events for external images and Bases board columns
- context-menu events for PDF outline items and pages
- context-menu events for a property's icon and CSS snippet rows
- context-menu events for property values and Bases column headers
- context-menu events for Live Preview table cells and drag handles
- context-menu events for callouts and plugin settings tabs
- context-menu events for the sidebar toggle buttons and community plugin rows
- context-menu event for PDF page thumbnails
- context-menu events for All properties and Web viewer history items

### Fixed

- **deps:** resolve KaTeX and Moment audit findings
- **demo-vault:** turn Canvas on before opening the demo canvas

### Documentation

- move event reference tables into demo notes
- **readme:** combine related resources and plugin comparisons
- cut the README to one table row per event
- add Similar plugins section to README
- record the 1.2.0 release in AGENTS.md

## 1.2.0

This release has 2 new features and 1 documentation change.

### New

- publish the canvas view and ribbon context-menu events
- publish the bookmarks context-menu events

### Documentation

- record the 1.1.1 release and the `CodeScript Toolkit` floor in AGENTS.md

## 1.1.1

This release has 1 fix and 4 documentation changes. 8 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- **demo-vault:** load the demo setup helpers from @mnaoumov/obsidian-lib

### Documentation

- shorten the debugging section
- **readme:** lead the Debugging section with `Advanced Debug Mode`
- mark plugin names as code
- record the 1.1.0 release in AGENTS.md

## 1.1.0

This release has 1 new feature and 2 documentation changes. 3 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### New

- **api:** merge the copyable api-contract.ts with full schemas

### Documentation

- merge marking plugin names as code
- merge the community directory listing links

## 1.0.1

This release has 1 fix and 1 documentation change. 6 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### Fixed

- **screenshots:** merge blurring the Settings search box before desktop frames

### Documentation

- **agents:** merge the 1.0.0 release record

## 1.0.0

This release has 4 new features, 5 fixes and 1 documentation change. 2 maintenance commits (tests, build, CI, refactoring, dependencies) are not listed.

### New

- **events:** say whether the user did it, as isUserInitiated on both payloads
- **screenshots:** decide what a screenshot can show for a plugin with no UI, then capture the set
- publish per-plugin community-plugin enabled and disabled events
- scaffold `More Events`

### Fixed

- **test:** merge the headless demo-vault toolkit install
- **deps:** restore the lockfile's missing resolved and integrity fields
- **deps:** override the `obsidian-integration-testing` peer so `npm` can resolve the tree
- **deps:** float devalue to 5.9.4, clearing GHSA-9rgm-9g3h-6x36
- **screenshots:** make the desktop capture reproducible

### Documentation

- **metadata:** describe the whole plugin, not its first set of events
