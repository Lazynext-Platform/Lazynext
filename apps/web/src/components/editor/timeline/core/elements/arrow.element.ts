/**
 * Arrow element — timeline shape element rendering an arrow with
 * fill, size, and configurable line width.
 *
 * @module components/editor/timeline/core/elements/arrow.element
 */

import { ArrowProps, Size } from "../../types";
import { TrackElement } from "./base.element";
import type { ElementVisitor } from "../visitor/element-visitor";
import { TIMELINE_ELEMENT_TYPE } from "../../utils/constants";

export class ArrowElement extends TrackElement {
	declare protected props: ArrowProps;

	constructor(fill: string, size: Size) {
		super(TIMELINE_ELEMENT_TYPE.ARROW);
		this.props = {
			fill,
			width: size.width,
			height: size.height,
			lineWidth: 4,
		};
	}

	accept<T>(visitor: ElementVisitor<T>): T {
		return visitor.visitArrowElement(this);
	}
}
