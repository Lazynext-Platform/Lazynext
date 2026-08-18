import assert from 'node:assert/strict';
import { createElement, createRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { TEMPLATES } from '../../editor/initial.ts';
import type { RefItem } from './ChatComposer.tsx';

// Built-in MG templates must have a display name (English-only product).
for (const template of TEMPLATES) {
 assert.ok(
 typeof template.name === 'string' && template.name.length > 0,
 `built-in MG template is missing a display name: ${template.name}`,
 );
}

const noop = () => undefined;
const selectedRefs: RefItem[] = [
 { id: 'builtin-template', kind: 'template', name: 'Bar Chart - Annual Sales' },
 { id: 'custom-template', kind: 'template', name: 'customtemplate' },
 { id: 'video-asset', kind: 'video', name: '77.mp4' },
];
const originalRefs = structuredClone(selectedRefs);
const testLocaleId = '\0template-reference-localization-test-locale';
const vite = await createServer({
 appType: 'custom',
 plugins: [{
 name: 'template-reference-localization-test-locale',
 enforce: 'pre',
 resolveId(id) {
 return id.endsWith('/i18n/locale') || id.endsWith('/i18n/locale.ts') ? testLocaleId : null;
 },
 load(id) {
 if (id !== testLocaleId) return null;
 return `
 export const getLocale = () => 'en';
 export const t = (text) => text;
 export const tData = (text) => text;
 export const useT = () => t;
 `;
 },
 }],
 server: { middlewareMode: true },
});

let composerMarkup = '';
try {
 const { ChatComposer } = await vite.ssrLoadModule('/src/components/chat/ChatComposer.tsx');
 composerMarkup = renderToStaticMarkup(createElement(ChatComposer, {
 value: '',
 onChange: noop,
 onSubmit: noop,
 onStop: noop,
 onEnhance: noop,
 enhancing: false,
 running: false,
 mode: 'agent', onModeChange: noop, autoApply: false, onAutoApplyChange: noop, selecting: false, onToggleSelecting: noop, creativeMode: null, onCreativeModeChange: noop, references: selectedRefs, onInsertRef: noop, selectedRefs, taRef: createRef<HTMLTextAreaElement>(), })); } finally { await vite.close(); } assert.match(composerMarkup, /Bar Chart - Annual Sales/,'built-in template chips should show their catalog name'); assert.match(composerMarkup, /customtemplate/,'unmatched custom template chips should keep their original name');
assert.match(composerMarkup, /77\.mp4/, 'non-template references should keep the media asset name');
assert.deepEqual(selectedRefs, originalRefs, 'localized display must not mutate the underlying references');

console.log('template-reference-localization.verify: template chips use display names');
