import type {
  InternalPlugin,
  InternalPluginInstance
} from '@obsidian-typings/obsidian-public-latest';
import type { App } from 'obsidian';

import {
  castTo,
  getPrototypeOf
} from 'obsidian-dev-utils/object-utils';
import { MonkeyAroundComponent } from 'obsidian-dev-utils/obsidian/components/monkey-around-component';

import type { UserInitiationRecorder } from '../plugin-events-component-base.ts';

/**
 * Parameters for the {@link InternalPluginPatchComponent} constructor.
 */
export interface InternalPluginPatchComponentConstructorParams {
  /**
   * The Obsidian application instance.
   */
  readonly app: App;

  /**
   * Where the intercepted flag is written.
   */
  readonly userInitiationRecorder: UserInitiationRecorder;
}

/**
 * A core plugin read generically — the shape every entry of `app.internalPlugins.plugins` has, with the
 * per-plugin instance type widened away because nothing here looks inside one.
 */
type CorePlugin = InternalPlugin<InternalPluginInstance<unknown>>;

/**
 * Recovers the `isEnabledByUser` / `isDisabledByUser` argument Obsidian takes and then throws away.
 *
 * `InternalPlugin.prototype.enable(isEnabledByUser)` and `.disable(isDisabledByUser)` are where every core
 * plugin transition happens — both are guarded, so every call that gets past the guard is a real
 * transition, and both end by triggering `change` on `app.internalPlugins`. The argument decides whether
 * the plugin's own `onUserEnable` / `onUserDisable` hooks run, and the **Settings -> Core plugins** toggle
 * passes `true`. It is simply not carried by the `change` signal, which is the one thing a diff of the
 * enabled set can never work out for itself.
 *
 * **The PROTOTYPE rather than each instance, and that is the point rather than a shortcut.** A vault has
 * about twenty-five `InternalPlugin` objects sharing one class, so patching instances would be
 * twenty-five patches doing one job. One patch here is what lets every consumer of these events have the
 * distinction without any of them patching anything — which is the whole argument for this plugin.
 *
 * The prototype is reached through any entry of `app.internalPlugins.plugins`, because the class is not
 * exported and `@obsidian-typings` describes it without handing over a constructor.
 */
export class InternalPluginPatchComponent extends MonkeyAroundComponent {
  private readonly app: App;
  private readonly userInitiationRecorder: UserInitiationRecorder;

  /**
   * Creates the component.
   *
   * @param params - The parameters.
   */
  public constructor(params: InternalPluginPatchComponentConstructorParams) {
    super();
    this.app = params.app;
    this.userInitiationRecorder = params.userInitiationRecorder;
  }

  /**
   * Installs both patches, or neither when there is no core plugin to read the prototype from.
   */
  public override onload(): void {
    super.onload();

    /*
     * `InternalPluginNamePluginsMapping` is a mapped type with one concrete plugin type per known id and no
     * index signature, so `Object.values` over it infers `unknown`. Widening to the base shape is what the
     * read needs and is honest about what is read: the prototype, and the instance's `id`.
     */
    const corePluginsById = castTo<Record<string, CorePlugin>>(this.app.internalPlugins.plugins);

    /*
     * A real Obsidian always has core plugins, so this is not a case that happens in a vault. It is here
     * because the record is typed as possibly empty and the prototype has to come from somewhere; the
     * events keep working without the patch, reporting `isUserInitiated: false` throughout.
     */
    const anyCorePlugin = Object.values(corePluginsById)[0];
    if (!anyCorePlugin) {
      return;
    }

    const corePluginPrototype = getPrototypeOf(anyCorePlugin);

    this.registerMethodPatch({
      $object: corePluginPrototype,
      methodName: 'enable',
      patchHandler: ({
        fallback,
        originalArguments,
        originalThis
      }) => {
        this.userInitiationRecorder.recordUserInitiation(originalThis.instance.id, originalArguments[0] ?? false);
        return fallback();
      }
    });

    this.registerMethodPatch({
      $object: corePluginPrototype,
      methodName: 'disable',
      patchHandler: ({
        fallback,
        originalArguments,
        originalThis
      }) => {
        this.userInitiationRecorder.recordUserInitiation(originalThis.instance.id, originalArguments[0] ?? false);
        fallback();
      }
    });
  }
}
