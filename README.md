# Bridge Demo Watchapp

A minimal Pebble watchapp that demonstrates the native Android `PebbleBridge`
introduced in coredevices/mobileapp#300.

## What it demonstrates

The bridge lets a watchapp's config page call external network APIs from within
the mobile app's WebView. Normally these requests would be blocked by WebView
CORS/mixed-content restrictions. With the bridge, the config page can delegate
requests to the native Android side.

This demo config page exercises four bridge APIs:

- `window.pebbleBridge.config` — config passed from the watchapp
- `window.pebbleBridge.fetch()` — HTTP request proxied by the native app
- `window.pebbleBridge.storage` — encrypted native storage
- `window.pebbleBridge.close()` — return a value to the watchapp

It fetches a random fact from `https://uselessfacts.jsph.pl` and returns it to
the watchapp to display.

## Files

- `src/c/main.c` — C watchapp that receives the fact via AppMessage and displays it.
- `src/js/app.js` — Companion JS that opens the config page and forwards the result to the watch.
- `package.json` — App metadata. Declares `configurable` and `config_network_bridge` capabilities.
- `docs/config/index.html` — Hosted config page that uses `window.pebbleBridge`.
- `docs/config/bridge-mock.js` — Browser mock for local testing.

## Hosted config page

```
https://caco3.github.io/bridge-demo/config/index.html?v=2
```

## Prebuilt binary

A prebuilt PBW is kept in the repository at:

```
build/bridge-demo.pbw
```

It is also served via GitHub Pages at:

```
https://caco3.github.io/bridge-demo/build/bridge-demo.pbw
```

GitHub Actions rebuilds the PBW on every push to `main` and commits the updated binary automatically.

## Build locally

```sh
pebble build
```

Produces `build/bridge-demo.pbw`.

## Sideload with ADB

Push the PBW to your Android phone and then open it with the Pebble/Rebble app:

```sh
adb push build/bridge-demo.pbw /sdcard/Download/bridge-demo.pbw
```

On the phone:
1. Open the Pebble/Rebble app.
2. Go to **Apps → Sideload** (or open the downloaded file from a file manager).
3. Select `bridge-demo.pbw` and install it.

Alternatively, if developer mode is enabled and the phone is reachable on the local network, you can install directly from the command line:

```sh
pebble install --phone <phone-ip-address> build/bridge-demo.pbw
```

## Test

1. Install a build of the mobile app that includes coredevices/mobileapp#300.
2. Sideload `build/bridge-demo.pbw` to your Pebble.
3. Open the watchapp on the watch.
4. Open the watchapp settings on the phone.
5. Tap **Fetch random fact**.
6. The fetched text is sent to the watch and shown on screen.
