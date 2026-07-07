/**
 * @module jest.setup
 * @description Test environment setup for Jest.
 *
 * Configures @testing-library/jest-dom matchers and polyfills
 * window.matchMedia for components that query media breakpoints.
 *
 * If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`.
 */

import "@testing-library/jest-dom";

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: jest.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(), // Deprecated
		removeListener: jest.fn(), // Deprecated
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
});
