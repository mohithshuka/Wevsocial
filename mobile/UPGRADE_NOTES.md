# Mobile app — regenerated for a clean Expo SDK 54 setup

This folder was regenerated from scratch (config + dependency graph). All
application source (`app/`, `kernel/`, `mini-apps/`, `shared/`, `types/`) is
carried over unchanged — none of it used any SDK-51-specific or deprecated
API, so no code changes were required, only the toolchain around it.

## What was wrong before

- `package.json` was still pinned to Expo SDK 51 (`expo ~51.0.28`,
  `react-native 0.74.5`, `react-native-reanimated ~3.10.1`) while
  `babel.config.js` / native modules had been partially bumped toward SDK 54,
  producing a mismatched dependency graph.
- `babel.config.js` manually listed `"react-native-reanimated/plugin"`, which
  conflicts with Reanimated 4 / Worklets and causes the "private properties
  are not supported" and missing-plugin Babel errors.
- `react-native-worklets` (a required peer of Reanimated 4 on SDK 54) was
  never installed.

## What changed

- **`package.json`** — every dependency pinned to versions from Expo SDK 54's
  official `bundledNativeModules.json` (React Native 0.81.5, React 19.1.0,
  Reanimated `~4.1.1`, `react-native-worklets 0.5.1`, `expo-router ~6.0.24`,
  etc). `react-native-worklets` added explicitly.
- **`babel.config.js`** — reduced to just `babel-preset-expo`. On SDK 54,
  `babel-preset-expo` configures the Worklets/Reanimated Babel plugin
  automatically; adding `react-native-reanimated/plugin` or
  `react-native-worklets/plugin` manually causes duplicate-plugin/Babel
  errors. Do not add either back in.
- **`metro.config.js`** — kept the same `@kernel` / `@mini-apps` / `@shared`
  / `@app-types` path aliases, generated from `expo/metro-config` (SDK-54
  compatible Metro version).
- **`app.json`** — added `"web": { "bundler": "metro" }`; everything else
  preserved.
- **`tsconfig.json`**, **`.eslintrc.js`**, **`.prettierrc`**, **`.env`** —
  carried over unchanged; still valid on SDK 54.

## How to verify

From a machine with npm registry access (this sandbox has network disabled,
so the install itself couldn't be executed here — all config/JS files were
syntax- and JSON-validated instead):

```bash
cd mobile
rm -rf node_modules package-lock.json
npm install
npx expo start
```

No manual patching should be required. If `npx expo-doctor` is available,
running it after install is a good extra sanity check.
