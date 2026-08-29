#!/usr/bin/env node
// ponytail — Codex UserPromptSubmit hook to track the active mode
// Inspects user input for @ponytail commands and writes mode to PLUGIN_DATA

const {
  getDefaultMode,
  isDeactivationCommand,
  normalizeMode,
  writeDefaultMode,
} = require('./ponytail-config');
const { clearMode, readMode, setMode, writeHookOutput } = require('./ponytail-runtime');

let input = '';
let done = false;

function emit(mode, context) {
  try { writeHookOutput('UserPromptSubmit', mode, context); } catch (e) {}
}

function finish() {
  if (done) return;
  done = true;

  let data;
  try {
    // Strip UTF-8 BOM some shells prepend when piping (breaks JSON.parse)
    data = JSON.parse(input.replace(/^\uFEFF/, ''));
  } catch (e) {
    // A malformed hook payload is a no-op, but still returns valid Codex JSON.
    try { process.stdout.write('{}'); } catch (ignored) {}
    return;
  }

  const prompt = typeof data?.prompt === 'string' ? data.prompt.trim().toLowerCase() : '';
  const parts = prompt ? prompt.split(/\s+/) : [];
  const command = parts[0] || '';
  const commandName = command.replace(/^[@/]/, '');

  // @ponytail-review is a session mode backed by its bundled skill.
  if (commandName === 'ponytail-review' && /^[@/]/.test(command)) {
    try { setMode('review'); } catch (e) {}
    emit('review', 'PONYTAIL MODE CHANGED — level: review');
    return;
  }

  if (commandName === 'ponytail' && /^[@/]/.test(command)) {
    const arg = parts[1] || '';

    // `@ponytail default <mode>` persists the default across sessions. Plain
    // switches stay session-scoped; review is intentionally session-only.
    if (arg === 'default') {
      const mode = normalizeMode(parts[2]);
      if (mode) {
        try {
          writeDefaultMode(mode);
          emit(
            mode,
            'PONYTAIL DEFAULT SET — new sessions start in ' + mode + '.',
          );
        } catch (e) {
          try { process.stdout.write('{}'); } catch (ignored) {}
        }
      }
      return;
    }

    if (!arg) {
      const mode = readMode() || getDefaultMode();
      emit(mode, 'PONYTAIL MODE ACTIVE — level: ' + mode);
      return;
    }

    const mode = normalizeMode(arg);
    if (!mode) return;
    try {
      if (mode === 'off') clearMode();
      else setMode(mode);
      emit(mode, mode === 'off'
        ? 'PONYTAIL MODE OFF'
        : 'PONYTAIL MODE CHANGED — level: ' + mode);
    } catch (e) {
      // State is best-effort; a bad writable path must not break the prompt.
    }
    return;
  }

  if (isDeactivationCommand(prompt)) {
    clearMode();
    emit('off', 'PONYTAIL MODE OFF');
  }
}

process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', finish);

// Never hang the session if a host leaves stdin open. The short fallback lets
// the hook recover any payload already received and exit cleanly.
process.stdin.on('error', () => { finish(); process.exit(0); });
setTimeout(() => { finish(); process.exit(0); }, 1000).unref();
