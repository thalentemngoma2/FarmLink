# TODO - Android build fix (MutationObserver)

- [ ] Fix react-native patch that breaks MutationObserver resolution
  - [ ] Edit `patches/react-native+0.85.3.patch` to revert/remove the `mutationobserver/MutationObserver.js` hunk (and keep unrelated hunks as needed)
  - [ ] Ensure patch still applies cleanly with `patch-package`
- [ ] Reinstall / reapply patches
  - [ ] Run `npm install` (or at least `npx patch-package`)
- [ ] Clean caches
  - [ ] Run `eas build --platform android --profile preview --clear-cache` (or equivalent)
- [ ] If it still fails
  - [ ] Investigate Metro config / aliases for webapis polyfills
  - [ ] Check for other patch hunks impacting RN internals
