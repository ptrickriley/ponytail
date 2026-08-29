#!/usr/bin/env node

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const { writeDefaultMode } = require('../hooks/ponytail-config');
const { filterSkillBodyForMode } = require('../hooks/ponytail-instructions');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ponytail-codex-'));
process.on('exit', () => fs.rmSync(temp, { recursive: true, force: true }));

function run(script, env = {}, input = '') {
  const childEnv = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || value === null) delete childEnv[key];
    else childEnv[key] = String(value);
  }
  return spawnSync(process.execPath, [path.join(root, 'hooks', script)], {
    env: childEnv,
    input,
    encoding: 'utf8',
  });
}

function assertOk(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.error, undefined);
}

function outputOf(result) {
  assertOk(result);
  assert.doesNotThrow(() => JSON.parse(result.stdout));
  return JSON.parse(result.stdout);
}

function envFor(dataDir, configHome, extra = {}) {
  return {
    HOME: path.join(temp, 'home'),
    USERPROFILE: path.join(temp, 'home'),
    PLUGIN_DATA: dataDir,
    XDG_CONFIG_HOME: configHome,
    PONYTAIL_DEFAULT_MODE: null,
    ...extra,
  };
}

test('both plugin manifests are valid Codex metadata', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.codex-plugin/plugin.json'), 'utf8'));
  const marketplace = JSON.parse(fs.readFileSync(path.join(root, '.agents/plugins/marketplace.json'), 'utf8'));

  assert.equal(manifest.name, 'ponytail');
  assert.equal(manifest.author.name, 'Patrick Riley');
  assert.equal(manifest.repository, 'https://github.com/ptrickriley/ponytail.git');
  assert.equal(manifest.skills, './skills/');
  assert.equal(manifest.hooks, './hooks/codex-hooks.json');
  assert.equal(manifest.interface.developerName, 'Patrick Riley');
  assert.equal(marketplace.plugins[0].source.url, 'https://github.com/ptrickriley/ponytail.git');
});

test('Codex hook manifest names only supported lifecycle hooks and shipped scripts', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.codex-plugin/plugin.json'), 'utf8'));
  const hooksPath = path.join(root, manifest.hooks.slice(2));
  const config = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));

  assert.deepEqual(Object.keys(config.hooks).sort(), [
    'SessionStart',
    'SubagentStart',
    'UserPromptSubmit',
  ]);

  for (const entries of Object.values(config.hooks)) {
    for (const entry of entries) {
      for (const hook of entry.hooks) {
        assert.match(hook.command, /^node \"\$\{PLUGIN_ROOT\}\/hooks\//);
        const script = hook.command.match(/hooks\/(.+\.js)\"/)[1];
        assert.ok(fs.existsSync(path.join(root, 'hooks', script)), script);
      }
    }
  }
});

test('SessionStart activates every runtime default mode', () => {
  for (const mode of ['off', 'lite', 'full', 'ultra']) {
    const dataDir = path.join(temp, 'activation', mode);
    const configHome = path.join(temp, 'config', mode);
    const result = run(
      'ponytail-activate.js',
      envFor(dataDir, configHome, { PONYTAIL_DEFAULT_MODE: mode }),
    );
    const output = outputOf(result);

    assert.equal(output.systemMessage, 'PONYTAIL:' + mode.toUpperCase());
    assert.equal(output.additionalContext, undefined);
    if (mode === 'off') {
      assert.equal(fs.existsSync(path.join(dataDir, '.ponytail-active')), false);
      assert.equal(output.hookSpecificOutput, undefined);
    } else {
      assert.equal(fs.readFileSync(path.join(dataDir, '.ponytail-active'), 'utf8'), mode);
      assert.equal(output.hookSpecificOutput.hookEventName, 'SessionStart');
      assert.match(output.hookSpecificOutput.additionalContext, new RegExp('level: ' + mode));
    }
  }
});

test('missing configuration falls back to full without requiring another state directory', () => {
  const dataDir = path.join(temp, 'missing-config-data');
  const result = run(
    'ponytail-activate.js',
    envFor(dataDir, path.join(temp, 'missing-config')),
  );
  const output = outputOf(result);

  assert.equal(fs.readFileSync(path.join(dataDir, '.ponytail-active'), 'utf8'), 'full');
  assert.match(output.hookSpecificOutput.additionalContext, /level: full/);
});

test('persisted default modes are used by the next session', () => {
  for (const mode of ['lite', 'full', 'ultra', 'off']) {
    const dataDir = path.join(temp, 'persisted-data', mode);
    const configHome = path.join(temp, 'persisted-config', mode);
    const configDir = path.join(configHome, 'ponytail');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ defaultMode: mode, keep: true }),
    );

    const result = run(
      'ponytail-activate.js',
      envFor(dataDir, configHome),
    );
    const output = outputOf(result);
    assert.equal(output.systemMessage, 'PONYTAIL:' + mode.toUpperCase());
    assert.equal(
      fs.existsSync(path.join(dataDir, '.ponytail-active')),
      mode !== 'off',
    );
  }
});

test('mode switching, reporting, review, and deactivation use Codex JSON', () => {
  const dataDir = path.join(temp, 'mode-data');
  const configHome = path.join(temp, 'mode-config');
  const env = envFor(dataDir, configHome);

  let output = outputOf(run(
    'ponytail-mode-tracker.js',
    env,
    JSON.stringify({ prompt: '@ponytail lite' }),
  ));
  assert.equal(fs.readFileSync(path.join(dataDir, '.ponytail-active'), 'utf8'), 'lite');
  assert.equal(output.systemMessage, 'PONYTAIL:LITE');
  assert.equal(output.hookSpecificOutput.hookEventName, 'UserPromptSubmit');

  output = outputOf(run(
    'ponytail-mode-tracker.js',
    env,
    JSON.stringify({ prompt: '@ponytail' }),
  ));
  assert.match(output.hookSpecificOutput.additionalContext, /level: lite/);

  output = outputOf(run(
    'ponytail-mode-tracker.js',
    env,
    JSON.stringify({ prompt: '@ponytail-review' }),
  ));
  assert.equal(fs.readFileSync(path.join(dataDir, '.ponytail-active'), 'utf8'), 'review');
  assert.equal(output.systemMessage, 'PONYTAIL:REVIEW');

  output = outputOf(run(
    'ponytail-mode-tracker.js',
    env,
    JSON.stringify({ prompt: 'normal mode' }),
  ));
  assert.equal(fs.existsSync(path.join(dataDir, '.ponytail-active')), false);
  assert.equal(output.systemMessage, 'PONYTAIL:OFF');

  output = outputOf(run(
    'ponytail-mode-tracker.js',
    env,
    JSON.stringify({ prompt: '@ponytail full' }),
  ));
  assert.equal(fs.readFileSync(path.join(dataDir, '.ponytail-active'), 'utf8'), 'full');
  assertOk(run(
    'ponytail-mode-tracker.js',
    env,
    JSON.stringify({ prompt: 'add a normal mode toggle' }),
  ));
  assert.equal(fs.readFileSync(path.join(dataDir, '.ponytail-active'), 'utf8'), 'full');

  output = outputOf(run(
    'ponytail-mode-tracker.js',
    env,
    JSON.stringify({ prompt: '@ponytail off' }),
  ));
  assert.equal(output.systemMessage, 'PONYTAIL:OFF');
});

test('default command persists without changing the active session', () => {
  const dataDir = path.join(temp, 'default-command-data');
  const configHome = path.join(temp, 'default-command-config');
  const env = envFor(dataDir, configHome);
  const result = run(
    'ponytail-mode-tracker.js',
    env,
    JSON.stringify({ prompt: '@ponytail default ultra' }),
  );
  const output = outputOf(result);

  assert.equal(JSON.parse(fs.readFileSync(path.join(configHome, 'ponytail/config.json'), 'utf8')).defaultMode, 'ultra');
  assert.equal(fs.existsSync(path.join(dataDir, '.ponytail-active')), false);
  assert.match(output.hookSpecificOutput.additionalContext, /new sessions start in ultra/);

  const invalid = run(
    'ponytail-mode-tracker.js',
    env,
    JSON.stringify({ prompt: '@ponytail default review' }),
  );
  assertOk(invalid);
  assert.equal(invalid.stdout, '');
});

test('subagents receive the active ruleset and stay silent when inactive', () => {
  const dataDir = path.join(temp, 'subagent-data');
  const env = envFor(dataDir, path.join(temp, 'subagent-config'));
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, '.ponytail-active'), 'full');

  let output = outputOf(run('ponytail-subagent.js', env));
  assert.equal(output.systemMessage, 'PONYTAIL:FULL');
  assert.equal(output.additionalContext, undefined);
  assert.equal(output.hookSpecificOutput.hookEventName, 'SubagentStart');
  assert.match(output.hookSpecificOutput.additionalContext, /level: full/);

  fs.writeFileSync(path.join(dataDir, '.ponytail-active'), 'off');
  const off = run('ponytail-subagent.js', env);
  assertOk(off);
  assert.equal(off.stdout, '');
});

test('malformed hook input is harmless and missing PLUGIN_DATA does not crash', () => {
  const malformed = run(
    'ponytail-mode-tracker.js',
    envFor(path.join(temp, 'malformed-data'), path.join(temp, 'malformed-config')),
    '{not json',
  );
  assert.deepEqual(outputOf(malformed), {});

  const missingData = run(
    'ponytail-activate.js',
    envFor(null, path.join(temp, 'no-plugin-data'), { PONYTAIL_DEFAULT_MODE: 'lite' }),
  );
  const output = outputOf(missingData);
  assert.equal(output.systemMessage, 'PONYTAIL:LITE');
  assert.match(output.hookSpecificOutput.additionalContext, /level: lite/);
});

test('skill body filtering keeps common rules and one mode-specific row', () => {
  const body = [
    '---',
    'name: example',
    '---',
    '# Rules',
    '| Level | Change |',
    '| --- | --- |',
    '| **lite** | small |',
    '| **full** | normal |',
    '| **ultra** | smallest |',
    '- lite: "name the alternative"',
    '- full: "delete first"',
    '- Full: keep this ordinary rule.',
  ].join('\n');

  const lite = filterSkillBodyForMode(body, 'lite');
  assert.doesNotMatch(lite, /\*\*full\*\*/);
  assert.doesNotMatch(lite, /\*\*ultra\*\*/);
  assert.match(lite, /\*\*lite\*\*/);
  assert.match(lite, /name the alternative/);
  assert.doesNotMatch(lite, /delete first/);
  assert.match(lite, /Full: keep this ordinary rule/);
});

test('writeDefaultMode merges a valid mode into existing config', () => {
  const configHome = path.join(temp, 'merge-config');
  const configDir = path.join(configHome, 'ponytail');
  fs.mkdirSync(configDir, { recursive: true });
  const configPath = path.join(configDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({ defaultMode: 'full', custom: 42 }));

  const previous = process.env.XDG_CONFIG_HOME;
  process.env.XDG_CONFIG_HOME = configHome;
  try {
    assert.equal(writeDefaultMode('ultra'), 'ultra');
    assert.deepEqual(JSON.parse(fs.readFileSync(configPath, 'utf8')), {
      defaultMode: 'ultra',
      custom: 42,
    });
  } finally {
    if (previous === undefined) delete process.env.XDG_CONFIG_HOME;
    else process.env.XDG_CONFIG_HOME = previous;
  }
});
