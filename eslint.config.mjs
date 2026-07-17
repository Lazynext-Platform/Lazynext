/** @module eslint.config ESLint flat configuration — Next.js + React + TypeScript strict + custom rules. */

import js from "@eslint/js";
import next from "@next/eslint-plugin-next";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";
import preferObjectParams from "./eslint/rules/prefer-object-params.mjs";

import jsdoc from "eslint-plugin-jsdoc";

const webFiles = ["apps/web/src/**/*.{ts,tsx}"];

const lazynextEslintPlugin = {
	meta: {
		name: "eslint-plugin-lazynext",
		version: "0.0.0",
	},
	rules: {
		"prefer-object-params": preferObjectParams,
	},
};

function scopeToWebFiles(config) {
	return {
		...config,
		files: webFiles,
	};
}

export default [
	{
		ignores: ["**/.next/**", "**/node_modules/**", "**/dist/**", "**/build/**"],
	},
	{
		files: webFiles,
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: {
				...globals.browser,
				...globals.node,
			},
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: "off",
		},
		settings: {
			react: {
				version: "detect",
			},
		},
	},
	scopeToWebFiles(js.configs.recommended),
	...tseslint.configs.recommended.map(scopeToWebFiles),
	scopeToWebFiles(react.configs.flat.recommended),
	scopeToWebFiles(react.configs.flat["jsx-runtime"]),
	scopeToWebFiles(reactHooks.configs.flat["recommended-latest"]),
	scopeToWebFiles(jsxA11y.flatConfigs.recommended),
	scopeToWebFiles(next.configs["core-web-vitals"]),
	jsdoc.configs["flat/recommended"],
	{
		files: webFiles,
		plugins: {
			lazynext: lazynextEslintPlugin,
		},
		rules: {
			"@typescript-eslint/no-empty-object-type": "warn",
			// Intentionally disabled: this is a WASM-FFI + dynamic-timeline editor
			// codebase. `any` and type assertions are correct for the WASM bindings
			// (see src/types/lazynext-wasm.d.ts) and dynamic editor state. Keeping
			// them as warnings only produced noise without actionable signal.
			"@typescript-eslint/no-unsafe-type-assertion": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/ban-ts-comment": "warn",
			"react/jsx-no-comment-textnodes": "warn",
			"react/no-unescaped-entities": "warn",
			// Disabled: these rules flag every custom div-based widget (timeline,
			// canvas viewport, splitters, overlays) in an interactive NLE application.
			// They are designed for content websites, not rich editors. All instances
			// were reviewed — genuine interactive elements already have proper ARIA.
			"jsx-a11y/click-events-have-key-events": "off",
			"jsx-a11y/no-static-element-interactions": "off",
			"jsx-a11y/alt-text": "warn",
			"jsx-a11y/label-has-associated-control": "warn",
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{
					argsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
					varsIgnorePattern: "^_",
				},
			],
			"no-empty": "warn",
			// Intentionally disabled: a project-wide positional-params style rule.
			// The codebase pervasively and deliberately uses positional params
			// (especially in the timeline/editor core). Demoting to avoid churn.
			"lazynext/prefer-object-params": "off",
			"prefer-const": "warn",
			"no-useless-catch": "warn",
			"no-useless-assignment": "warn",
			"react-hooks/immutability": "warn",
			"react-hooks/set-state-in-effect": "warn",
			"react-hooks/refs": "warn",
			"jsx-a11y/no-noninteractive-element-interactions": "warn",

			// `react/prop-types` is for the JS-era React workflow where runtime
			// `propTypes` declarations are the prop contract. In this TS-only
			// scope the prop types already are the contract; the rule's only
			// effect is false positives when it can't trace destructured props
			// back to a `propTypes` definition that doesn't exist.
			"react/prop-types": "off",
			"jsx-a11y/media-has-caption": "warn",
			"react/no-unknown-property": "warn",
			"jsx-a11y/html-has-lang": "warn",
			"@next/next/no-html-link-for-pages": "warn",
			"jsx-a11y/anchor-is-valid": "warn",
			"jsdoc/require-jsdoc": ["warn", { 
				"require": {
					"FunctionDeclaration": true,
					"MethodDefinition": true,
					"ClassDeclaration": true,
					"ArrowFunctionExpression": true,
					"FunctionExpression": true
				}
			}],
			"jsdoc/require-description": "warn",
			"jsdoc/require-returns": "off",
			"jsdoc/require-param": "off",
			"jsdoc/require-param-type": "off"
		},
	},
	scopeToWebFiles(eslintConfigPrettier),
];
