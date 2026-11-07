# Mobile keyboard events

`More Events` announces the mobile app's keyboard on `app.workspace`, without patching Obsidian. It relays the four notifications the app's native keyboard plugin sends to the page, under names that say what each one does and does not mean.

| Event                                   | Fires when                                        | Arguments |
| --------------------------------------- | ------------------------------------------------- | --------- |
| `more-events:mobile-keyboard-hidden`    | the keyboard finished animating and is down       | `state`   |
| `more-events:mobile-keyboard-shown`     | the keyboard finished animating and is up         | `state`   |
| `more-events:mobile-keyboard-will-hide` | a keyboard animation starts while it is up        | `state`   |
| `more-events:mobile-keyboard-will-show` | a keyboard animation starts towards a visible one | `state`   |

Available in contract `1.15.0`.

## What it means

`state` is plain data: `hasPhysicalKeyboard`, `keyboardHeight` and `screenHeight`, both heights in CSS pixels. `keyboardHeight` is the height the keyboard is animating to for a will-show, its final height for a shown, and `0` for both hide events.

**Read the state from the shown and hidden events.** They fire when the animation has ended. The two will events fire when it starts, which is when Obsidian itself moves its toolbar, so use them for layout that should move with the keyboard. On Android, a keyboard that is already up and only changes its height (switching to the emoji panel, for example) sends will-hide, then will-show, then shown. So a will-hide is never proof that the keyboard is going away.

`hasPhysicalKeyboard` is `true` when a hardware keyboard is attached. Obsidian then treats the on-screen keyboard as not shown, even if a small keyboard toolbar takes some space.

Nothing fires on desktop. There is no initial replay. Obsidian keeps the same state in `Platform.mobileSoftKeyboardVisible`, which is not in the public API.

## Listen

Copy [api.d.ts](https://github.com/mnaoumov/obsidian-more-events/blob/HEAD/api.d.ts) into the listening plugin:

```ts
this.registerEvent(app.workspace.on('more-events:mobile-keyboard-shown', ({ keyboardHeight }) => {
  console.log('The keyboard is up and takes', keyboardHeight, 'px');
}));
```

```code-button
---
caption: Listen for the keyboard
---
require('/demoSetup.ts').startListeningToMobileKeyboard(app);
```

```code-button
---
caption: Stop listening
---
require('/demoSetup.ts').stopListeningToMobileKeyboard();
```

On a phone or tablet, after the listen button, tap into a note: notices show the keyboard coming up with its height, and going down when you close it.
