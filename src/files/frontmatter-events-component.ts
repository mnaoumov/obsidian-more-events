import type {
  App,
  CachedMetadata,
  TAbstractFile
} from 'obsidian';

import { isDeepEqual } from '@mnaoumov/typescript-lib/object-utils';
import { Component } from 'obsidian';

import { FRONTMATTER_CHANGED_EVENT_NAME } from '../api/more-events-api.ts';

/**
Parameters for the frontmatter announcer.
*/
export interface FrontmatterEventsComponentConstructorParams {
  /**
  The application whose metadata is observed.
  */
  readonly app: App;
}

/**
Diffs independent snapshots of indexed frontmatter without patching Obsidian.
*/
export class FrontmatterEventsComponent extends Component {
  private readonly app: App;
  private readonly snapshots = new Map<TAbstractFile, Record<string, unknown>>();

  /** Creates the announcer.
   * @param params - The application.
   */
  public constructor(params: FrontmatterEventsComponentConstructorParams) {
    super();
    this.app = params.app;
  }

  /**
  Establishes a baseline and subscribes to metadata indexing.
  */
  public override onload(): void {
    super.onload();
    for (const file of this.app.vault.getMarkdownFiles()) {
      const cache = this.app.metadataCache.getFileCache(file);
      if (cache) {
        this.snapshots.set(file, snapshot(cache));
      }
    }
    this.registerEvent(this.app.metadataCache.on('changed', (file, _data, cache) => {
      const previous = this.snapshots.get(file);
      const current = snapshot(cache);
      this.snapshots.set(file, current);
      // An initial index supplies the baseline, not a change with invented old values.
      if (!previous) {
        return;
      }
      const keys = [...new Set([...Object.keys(previous), ...Object.keys(current)])]
        .filter((key) => Object.hasOwn(previous, key) !== Object.hasOwn(current, key) || !isDeepEqual(previous[key], current[key]))
        .sort();
      if (keys.length > 0) {
        this.app.workspace.trigger(FRONTMATTER_CHANGED_EVENT_NAME, file, {
          changedKeys: keys,
          // eslint-disable-next-line n/no-unsupported-features/node-builtins -- Runs in Obsidian's renderer, whose supported Chromium versions provide structuredClone.
          newValues: structuredClone(current),
          oldValues: previous
        });
      }
    }));
    this.registerEvent(this.app.vault.on('delete', (file) => {
      this.snapshots.delete(file);
    }));
    this.register(() => {
      this.snapshots.clear();
    });
  }
}

function snapshot(cache: CachedMetadata): Record<string, unknown> {
  // `position` is Obsidian's deprecated cache bookkeeping, not a YAML property.
  // eslint-disable-next-line n/no-unsupported-features/node-builtins -- Runs in Obsidian's renderer, whose supported Chromium versions provide structuredClone.
  return structuredClone(Object.fromEntries(Object.entries(cache.frontmatter ?? {}).filter(([key]) => key !== 'position')));
}
