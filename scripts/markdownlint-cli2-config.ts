import type { MarkdownlintCli2ConfigurationSchema } from '@mnaoumov/typescript-dev-toolkit/linters/markdownlint-types/@types/markdownlint-cli2-config-schema';

import { obsidianMarkdownlintCli2Config } from '@mnaoumov/obsidian-dev-toolkit/linters/markdownlint-cli2-config';

export const config: MarkdownlintCli2ConfigurationSchema = {
  ...obsidianMarkdownlintCli2Config,
  config: {
    ...obsidianMarkdownlintCli2Config.config,
    // Turned on here, against the shared default of off: every paragraph in this repo's markdown is one
    // physical line, and this is what stops hard wrapping from coming back. The key has to live inside
    // `config` - the spread above replaces the whole object, so a key beside it would be silently ignored.
    'no-soft-break-in-paragraph': true,
    // In this plugin's prose `node` is always a canvas node - a card the canvas events and menus name - and
    // never the Node.js command. Prose about the runtime writes `Node`, which the case-sensitive matcher
    // does not catch either way.
    'tool-name-as-code': {
      excludedToolNames: ['node']
    }
  }
};
