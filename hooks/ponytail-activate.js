#!/usr/bin/env node
// ponytail — Codex SessionStart activation hook
//
// Runs on every session start:
//   1. Writes the current mode to Codex's writable PLUGIN_DATA directory
//   2. Emits ponytail ruleset as hidden SessionStart context

const { getDefaultMode } = require('./ponytail-config');
const { getPonytailInstructions } = require('./ponytail-instructions');
const { clearMode, setMode, writeHookOutput } = require('./ponytail-runtime');

const mode = getDefaultMode();

// "off" mode — clear the session flag and emit only the Codex status marker.
if (mode === 'off') {
  clearMode();
  try { writeHookOutput('SessionStart', 'off'); } catch (e) {}
  process.exit(0);
}

// 1. Write the session mode. State is best-effort so a missing writable
// PLUGIN_DATA directory never prevents Codex from starting.
try {
  setMode(mode);
} catch (e) {
  // Silent fail — mode state is best-effort, don't block the hook.
}

// 2. Emit the ponytail ruleset, filtered to the active intensity level.
const output = getPonytailInstructions(mode);

try {
  writeHookOutput('SessionStart', mode, output);
} catch (e) {
  // Silent fail — stdout closed/EPIPE at hook exit must not surface as a hook failure
}
