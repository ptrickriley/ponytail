const fs = require('fs');
const path = require('path');
const { normalizePersistedMode } = require('./ponytail-config');

const STATE_FILE = '.ponytail-active';
const statePath = process.env.PLUGIN_DATA
  ? path.join(process.env.PLUGIN_DATA, STATE_FILE)
  : null;

function setMode(mode) {
  const normalized = normalizePersistedMode(mode);
  if (!statePath || !normalized) return null;
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, normalized, 'utf8');
  return normalized;
}

function clearMode() {
  if (!statePath) return;
  try { fs.unlinkSync(statePath); } catch (e) {}
}

// Live mode written by activate/mode-tracker. Absent flag = ponytail off.
function readMode() {
  if (!statePath) return null;
  try {
    return normalizePersistedMode(fs.readFileSync(statePath, 'utf8').trim());
  } catch (e) {
    return null;
  }
}

function writeHookOutput(event, mode, context = '') {
  const normalized = normalizePersistedMode(mode) || 'off';
  const output = { systemMessage: `PONYTAIL:${normalized.toUpperCase()}` };
  if (context) output.hookSpecificOutput = {
    hookEventName: event,
    additionalContext: context,
  };
  process.stdout.write(JSON.stringify(output));
}

module.exports = {
  clearMode,
  readMode,
  setMode,
  writeHookOutput,
};
