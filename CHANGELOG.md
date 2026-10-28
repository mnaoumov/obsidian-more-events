# CHANGELOG

## 1.3.0

- chore(deps): cap integration emulator cores with obsidian-integration-testing 17.7.1
- refactor: name patched plugin lifecycle arguments
- fix(deps): resolve KaTeX and Moment audit findings
- chore: adopt readonly interface members
- feat: publish PDF toolbar menu events
- refactor: group events and tests by subject
- feat: publish File Explorer root menu events
- refactor: use typed bookmarks menu workspace event
- docs: move event reference tables into demo notes
- docs(readme): combine related resources and plugin comparisons
- feat: announce the Bases view settings More options menu
- docs: cut the README to one table row per event
- feat: relay the canvas connection drop menu
- docs: add Similar plugins section to README
- feat: context-menu events for the history buttons and the plugin row's More options button
- feat: relays of the canvas node, connection and selection menus
- feat: relays of the Search results, note margin and Properties heading menus
- feat: context-menu events for the vault name, and relays of leaf-menu and tab-group-menu
- feat: context-menu events for external images and Bases board columns
- feat: context-menu events for PDF outline items and pages
- feat: context-menu events for a property's icon and CSS snippet rows
- feat: context-menu events for property values and Bases column headers
- feat: context-menu events for Live Preview table cells and drag handles
- feat: context-menu events for callouts and plugin settings tabs
- feat: context-menu events for the sidebar toggle buttons and community plugin rows
- feat: context-menu event for PDF page thumbnails
- feat: context-menu events for All properties and Web viewer history items
- fix(demo-vault): turn Canvas on before opening the demo canvas
- docs: record the 1.2.0 release in AGENTS.md

## 1.2.0

- feat: publish the canvas view and ribbon context-menu events
- feat: publish the bookmarks context-menu events
- docs: record the 1.1.1 release and the `CodeScript Toolkit` floor in AGENTS.md

## 1.1.1

- test(demo-vault): require `CodeScript Toolkit` 15.0.0, the first to serve obsidian-lib 6
- build(deps): move to obsidian-lib 6 and off the dropped obsidian-dev-utils names
- docs: shorten the debugging section
- fix(demo-vault): load the demo setup helpers from @mnaoumov/obsidian-lib
- docs(readme): lead the Debugging section with `Advanced Debug Mode`
- build(deps): float brace-expansion, sharp and fast-uri past their advisories
- docs: mark plugin names as code
- build(deps): merge taking obsidian-lib 4.3.0 and its validation debug switch
- test(api-contract): verify the contract with verifyApiContract from typescript-lib 1.5.0
- refactor(api-contract): merge building the contract guards from typescript-lib
- chore(github): point questions to Discussions from the new-issue page
- ci: merge attesting release assets through the toolkit's reusable workflow
- docs: record the 1.1.0 release in AGENTS.md

## 1.1.0

- refactor: merge moving off obsidian-dev-utils onto the @mnaoumov packages
- refactor(api): merge building api-contract.ts on @mnaoumov/typescript-lib/api-contract
- feat(api): merge the copyable api-contract.ts with full schemas
- docs: merge marking plugin names as code
- test: merge using the obsidian-typings declarations of Obsidian internals
- docs: merge the community directory listing links

## 1.0.1

- test(screenshots): merge applying the dark theme through applyObsidianTheme
- test(screenshots): merge dropping the local caret blur
- fix(screenshots): merge blurring the Settings search box before desktop frames
- build(deps): merge the obsidian-integration-testing 17 float
- build(deps): merge the obsidian-test-mocks ^7.0.0 float
- refactor(patches): merge the patch against app.plugins own typings
- build(deps): merge the obsidian-integration-testing override removal
- docs(agents): merge the 1.0.0 release record

## 1.0.0

- fix(test): merge the headless demo-vault toolkit install
- fix(deps): restore the lockfile's missing resolved and integrity fields
- fix(deps): override the obsidian-integration-testing peer so npm can resolve the tree
- fix(deps): float devalue to 5.9.4, clearing GHSA-9rgm-9g3h-6x36
- docs(metadata): describe the whole plugin, not its first set of events
- feat(events): say whether the user did it, as isUserInitiated on both payloads
- refactor(screenshots): let the harness own the vault-name hide
- fix(screenshots): make the desktop capture reproducible
- feat(screenshots): decide what a screenshot can show for a plugin with no UI, then capture the set
- feat: publish per-plugin community-plugin enabled and disabled events
- test(integration): prove the core-plugin events against a real Obsidian
- feat: scaffold `More Events`
