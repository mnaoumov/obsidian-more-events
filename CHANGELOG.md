# CHANGELOG

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
- feat: scaffold More Events
