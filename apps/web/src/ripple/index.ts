/**
 * @module ripple
 * @description Ripple editing subsystem — computes freed intervals
 *   from timeline diffs and shifts downstream elements to close gaps.
 */

export type { RippleAdjustment } from "./apply";
export { applyRippleAdjustments } from "./apply";
export { computeRippleAdjustments } from "./diff";
export { rippleShiftElements } from "./shift";
