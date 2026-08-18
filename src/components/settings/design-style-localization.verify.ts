import assert from 'node:assert/strict';
import { DESIGN_STYLE_PRESETS } from '../../editor/design-presets';
import {
  localizeDesignFontRole,
  localizeDesignPresetName,
  localizeDesignRole,
  localizeDesignStyleGuide,
} from './designStyleLocalization';

const modern = DESIGN_STYLE_PRESETS.find((preset) => preset.name === 'Modern Editorial');
assert.ok(modern, 'test data should contain Modern Editorial');

// English-only: localization functions return the input unchanged.
assert.equal(localizeDesignPresetName(modern.name, 'en'), modern.name);
assert.equal(localizeDesignRole('background-chart', 'en'), 'background-chart');
assert.equal(localizeDesignRole('chart-warm-mid', 'en'), 'chart-warm-mid');
assert.equal(localizeDesignFontRole('accent', 'en'), 'accent');
assert.equal(localizeDesignFontRole('callout', 'en'), 'callout');
assert.equal(localizeDesignFontRole('impact', 'en'), 'impact');
assert.equal(
  localizeDesignStyleGuide(modern.style.styleGuide ?? '', 'en'),
  modern.style.styleGuide,
);

for (const preset of DESIGN_STYLE_PRESETS) {
  assert.equal(localizeDesignPresetName(preset.name, 'en'), preset.name);
  assert.equal(
    localizeDesignStyleGuide(preset.style.styleGuide ?? '', 'en'),
    preset.style.styleGuide,
  );
}

console.log('design-style-localization.verify: English-only localization returns input unchanged');
