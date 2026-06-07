import { describe, expect, it, beforeEach } from "bun:test";
import { SelectionManager } from "../selection-manager";

function createManager(): SelectionManager {
	return new SelectionManager({} as any);
}

describe("SelectionManager", () => {
	let manager: SelectionManager;

	beforeEach(() => {
		manager = createManager();
	});

	describe("initial state", () => {
		it("has no selected elements initially", () => {
			expect(manager.getSelectedElements()).toEqual([]);
		});

		it("has no selected keyframes initially", () => {
			expect(manager.getSelectedKeyframes()).toEqual([]);
		});

		it("has null active selection kind initially", () => {
			expect(manager.getActiveSelectionKind()).toBeNull();
		});

		it("getSnapshot returns empty state", () => {
			const snap = manager.getSnapshot();
			expect(snap.selectedElements).toEqual([]);
			expect(snap.selectedKeyframes).toEqual([]);
			expect(snap.keyframeSelectionAnchor).toBeNull();
			expect(snap.selectedMaskPoints).toBeNull();
		});
	});

	describe("setSelectedElements", () => {
		it("sets selected elements", () => {
			const elements = [{ trackId: "t1", elementId: "e1" }];
			manager.setSelectedElements({ elements });
			expect(manager.getSelectedElements()).toEqual(elements);
		});

		it("returns 'elements' as active selection kind", () => {
			manager.setSelectedElements({ elements: [{ trackId: "t1", elementId: "e1" }] });
			expect(manager.getActiveSelectionKind()).toBe("elements");
		});

		it("clears keyframe selection when elements are selected", () => {
			manager.setSelectedKeyframes({
				keyframes: [{ trackId: "t1", elementId: "e1", propertyPath: "opacity", keyframeId: "k1" }],
			});
			manager.setSelectedElements({ elements: [{ trackId: "t1", elementId: "e1" }] });
			expect(manager.getSelectedKeyframes()).toEqual([]);
		});
	});

	describe("setSelectedKeyframes", () => {
		it("sets selected keyframes", () => {
			const kfs = [{ trackId: "t1", elementId: "e1", propertyPath: "opacity", keyframeId: "k1" }];
			manager.setSelectedKeyframes({ keyframes: kfs });
			expect(manager.getSelectedKeyframes()).toEqual(kfs);
		});

		it("returns 'keyframes' as active selection kind", () => {
			manager.setSelectedKeyframes({
				keyframes: [{ trackId: "t1", elementId: "e1", propertyPath: "opacity", keyframeId: "k1" }],
			});
			expect(manager.getActiveSelectionKind()).toBe("keyframes");
		});

		it("sets keyframe selection anchor", () => {
			const kfs = [{ trackId: "t1", elementId: "e1", propertyPath: "opacity", keyframeId: "k1" }];
			const anchor = kfs[0];
			manager.setSelectedKeyframes({ keyframes: kfs, anchorKeyframe: anchor });
			expect(manager.getKeyframeSelectionAnchor()).toEqual(anchor);
		});

		it("clears mask point selection when keyframes are selected", () => {
			manager.setSelectedMaskPoints({
				selection: { trackId: "t1", elementId: "e1", maskId: "m1", pointIds: ["p1"] },
			});
			manager.setSelectedKeyframes({
				keyframes: [{ trackId: "t1", elementId: "e1", propertyPath: "opacity", keyframeId: "k1" }],
			});
			expect(manager.getSelectedMaskPointSelection()).toBeNull();
		});
	});

	describe("clearSelection", () => {
		it("clears all selections", () => {
			manager.setSelectedElements({ elements: [{ trackId: "t1", elementId: "e1" }] });
			manager.setSelectedKeyframes({
				keyframes: [{ trackId: "t1", elementId: "e1", propertyPath: "opacity", keyframeId: "k1" }],
			});
			manager.clearSelection();
			expect(manager.getSelectedElements()).toEqual([]);
			expect(manager.getSelectedKeyframes()).toEqual([]);
		});
	});

	describe("clearMostSpecificSelection", () => {
		it("clears mask points when they are the most specific", () => {
			manager.setSelectedMaskPoints({
				selection: { trackId: "t1", elementId: "e1", maskId: "m1", pointIds: ["p1"] },
			});
			expect(manager.clearMostSpecificSelection()).toBe(true);
			expect(manager.getSelectedMaskPointSelection()).toBeNull();
		});

		it("clears keyframes when no mask points selected", () => {
			manager.setSelectedKeyframes({
				keyframes: [{ trackId: "t1", elementId: "e1", propertyPath: "opacity", keyframeId: "k1" }],
			});
			expect(manager.clearMostSpecificSelection()).toBe(true);
			expect(manager.getSelectedKeyframes()).toEqual([]);
		});

		it("returns false when nothing selected", () => {
			expect(manager.clearMostSpecificSelection()).toBe(false);
		});
	});

	describe("subscribe", () => {
		it("notifies listener on selection change", () => {
			let notified = false;
			manager.subscribe(() => { notified = true; });
			manager.setSelectedElements({ elements: [{ trackId: "t1", elementId: "e1" }] });
			expect(notified).toBe(true);
		});

		it("returns unsubscribe function", () => {
			let count = 0;
			const unsub = manager.subscribe(() => { count++; });
			manager.setSelectedElements({ elements: [{ trackId: "t1", elementId: "e1" }] });
			expect(count).toBe(1);
			unsub();
			manager.setSelectedElements({ elements: [{ trackId: "t2", elementId: "e2" }] });
			expect(count).toBe(1);
		});
	});

	describe("applySelectionPatch", () => {
		it("applies element patch", () => {
			const snap = manager.applySelectionPatch({
				patch: { selectedElements: [{ trackId: "t1", elementId: "e1" }], selectedKeyframes: [], keyframeSelectionAnchor: null, selectedMaskPoints: null },
			});
			expect(snap.selectedElements).toEqual([{ trackId: "t1", elementId: "e1" }]);
		});

		it("leaves unspecified fields unchanged", () => {
			manager.setSelectedElements({ elements: [{ trackId: "t1", elementId: "e1" }] });
			const snap = manager.applySelectionPatch({
				patch: { selectedKeyframes: [], keyframeSelectionAnchor: null, selectedMaskPoints: null },
			});
			expect(snap.selectedElements).toEqual([{ trackId: "t1", elementId: "e1" }]);
		});
	});

	describe("restoreSnapshot", () => {
		it("restores previous snapshot", () => {
			manager.setSelectedElements({ elements: [{ trackId: "t1", elementId: "e1" }] });
			const snap = manager.getSnapshot();

			manager.setSelectedElements({ elements: [{ trackId: "t2", elementId: "e2" }] });
			manager.restoreSnapshot({ snapshot: snap });

			expect(manager.getSelectedElements()).toEqual([{ trackId: "t1", elementId: "e1" }]);
		});

		it("restores keyframes from snapshot", () => {
			const kfs = [{ trackId: "t1", elementId: "e1", propertyPath: "opacity", keyframeId: "k1" }];
			manager.setSelectedKeyframes({ keyframes: kfs });
			const snap = manager.getSnapshot();

			manager.clearSelection();
			manager.restoreSnapshot({ snapshot: snap });

			expect(manager.getSelectedKeyframes()).toEqual(kfs);
		});
	});
});
