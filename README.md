# Bridge Demo Watchapp

A minimal Pebble watchapp that demonstrates the native Android `PebbleBridge`
introduced in coredevices/mobileapp#300.

## What it demonstrates

The bridge lets a watchapp's config page call external network APIs from within
the mobile app's WebView. Normally these requests would be blocked by WebView
CORS/mixed-content restrictions. With the bridge, the config page can delegate
requests to the native Android side.

This demo fetches a random fact from `https://uselessfacts.jsph.pl` in the
config page and sends it back to the watch to display.

## Files

- `src/c/main.c` — C watchapp that receives the fact via AppMessage and displays it.
- `src/js/app.js` — Companion JS that opens the config page and forwards the result to the watch.
- `package.json` — App metadata. Declares `configurable` and `config_network_bridge` capabilities.
- `docs/config/index.html` — Hosted config page that uses `window.pebbleBridge.fetch()`.

## Hosted config page

```
https://caco3.github.io/bridge-demo/config/index.html
```

## Build

```sh
pebble build
```

Produces `build/bridge-demo.pbw`.

## Test

1. Install a build of the mobile app that includes coredevices/mobileapp#300.
2. Sideload `build/bridge-demo.pbw` to your Pebble.
3. Open the watchapp on the watch.
4. Open the watchapp settings on the phone.
5. Tap **Fetch random fact**.
6. The fetched text is sent to the watch and shown on screen.
