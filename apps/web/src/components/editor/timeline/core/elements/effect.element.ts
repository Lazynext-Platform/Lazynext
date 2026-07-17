/**
 * Effect element — timeline element wrapping a named GPU effect
 * key with configurable intensity applied over its time range.
 *
 * @module components/editor/timeline/core/elements/effect.element
 */

import { TrackElement } from "./base.element";
import type { ElementVisitor } from "../visitor/element-visitor";
import { TIMELINE_ELEMENT_TYPE } from "../../utils/constants";
import type { EffectProps } from "../../types";

/** Class representing EffectElement. */
export class EffectElement extends TrackElement {
	declare protected props: EffectProps;

	constructor(
		effectKey: EffectProps["effectKey"],
		props?: Partial<EffectProps>,
	) {
		super(TIMELINE_ELEMENT_TYPE.EFFECT);
		this.props = {
			effectKey,
			intensity: 1,
			...(props || {}),
		};
	}

	getEffectKey(): EffectProps["effectKey"] {
		return this.props.effectKey;
	}

	getIntensity(): number {
		return this.props.intensity ?? 1;
	}

	getProps(): EffectProps {
		return this.props;
	}

	setEffectKey(effectKey: EffectProps["effectKey"]): this {
		this.props.effectKey = effectKey;
		return this;
	}

	setIntensity(intensity: number): this {
		this.props.intensity = intensity;
		return this;
	}

	setProps(props: EffectProps): this {
		this.props = structuredClone(props);
		return this;
	}

	accept<T>(visitor: ElementVisitor<T>): T {
		return visitor.visitEffectElement(this);
	}
}
