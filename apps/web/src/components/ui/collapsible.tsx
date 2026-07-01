"use client";

/** @component Renders a panel whose content can be shown/hidden by a trigger. */

import { Collapsible as CollapsiblePrimitive } from "radix-ui";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
