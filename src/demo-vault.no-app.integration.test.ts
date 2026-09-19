import process from 'node:process';
import { registerDemoVaultCoverageSuite } from 'obsidian-dev-utils/script-utils/demo-vault-coverage';
import { getRootFolder } from 'obsidian-dev-utils/script-utils/root';

// Keeps the in-repo `demo-vault/` honest WITHOUT launching Obsidian. More Events has no settings, so there
// is no config interface to reflect. Its public surface is reflected instead: `MoreEventsApi` lives in the
// repo-root `api.d.ts`, which is the file a consumer reads, so a member added there and demonstrated
// nowhere fails here — and a member the notes name after it has been renamed fails too.
//
// The events themselves cannot be reflected the same way: they are literal TYPES rather than interface
// members, and the notes carry their names as prose. `src/more-events-api.test.ts` pins those strings.
//
// What the suite enforces regardless is the authoring convention every vault owes its readers: an `# H1`
// and a prose opener on every note, Markdown links rather than wikilinks (which do not render on GitHub),
// no `[Docs]` line, and every note reachable from `00 Start.md`.
registerDemoVaultCoverageSuite({
  interfaces: [{
    interfaceName: 'MoreEventsApi',
    kind: 'methods',
    receiver: 'moreEventsApi',
    sourcePath: 'api.d.ts'
  }],
  nonTrivialGuard: {
    expectDemoNote: '03 For plugin developers.md',
    expectMember: 'getEnabledCorePluginIds',
    interfaceName: 'MoreEventsApi',
    sourcePath: 'api.d.ts'
  },
  rootFolder: getRootFolder() ?? process.cwd()
});
