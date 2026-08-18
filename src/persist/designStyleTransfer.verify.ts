import assert from 'node:assert/strict';
import type { DesignStyle } from '../editor/types';
import { buildDesignStyleRecipe, parseDesignStyleRecipe } from './designStyleTransfer';

const style: DesignStyle = {
 colors: [{ role: ' accent ', value: ' #ff5500 ' }],
 fonts: [{ role: 'heading', family: ' Inter ' }],
 styleGuide: ' Modern and clean. ',
};
const built = buildDesignStyleRecipe(' Brand Style ', style, {
 scenarios: [' social ', 'social', 'launch'],
});
const parsed = parseDesignStyleRecipe(JSON.stringify(built));

assert.equal(parsed.name, 'Brand Style');
assert.deepEqual(parsed.scenarios, ['social', 'launch']);
assert.deepEqual(parsed.style.colors, [{ role: 'accent', value: '#ff5500' }]);
assert.equal(parsed.style.fonts[0]?.family, 'Inter');
assert.equal(parsed.style.styleGuide, 'Modern and clean.');

assert.throws(() => parseDesignStyleRecipe('{'), /JSON/);
assert.throws(() => parseDesignStyleRecipe(JSON.stringify({ ...built, version: 2 })), /version/);
assert.throws(() => parseDesignStyleRecipe(JSON.stringify({
 ...built,
 style: { colors: [{ role: 'accent' }], fonts: [] },
})), /ok/);

console.log('designStyleTransfer.verify: ok');
