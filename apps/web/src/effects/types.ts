/** @module Effects type definitions for GPU effect registration and parameter passing */
import type { ParamDefinition, ParamValues } from "@/params";

export interface Effect {
	/** Unique identifier for the effect instance. */
	id: string;
	/** Effect type discriminator. */
	type: string;
	/** Current parameter values for the effect. */
	params: ParamValues;
	/** Whether the effect is currently active. */
	enabled: boolean;
}

export type EffectUniformValue = number | number[];

export interface EffectPass {
	/** Shader source or identifier for this pass. */
	shader: string;
	/** Uniform values passed to the shader. */
	uniforms: Record<string, EffectUniformValue>;
}

export interface EffectPassTemplate {
	/** Shader source or identifier for this pass. */
	shader: string;
	/** Computes uniform values from effect params and dimensions. */
	uniforms(params: {
		/** Effect parameter values */
		effectParams: ParamValues;
		/** Output width in pixels */
		width: number;
		/** Output height in pixels */
		height: number;
	}): Record<string, EffectUniformValue>;
}

export interface EffectRendererConfig {
	/** Ordered shader pass templates for the effect. */
	passes: EffectPassTemplate[];
	/** Optional dynamic builder for constructing render passes. */
	buildPasses?: (params: {
		/** Effect parameter values */
		effectParams: ParamValues;
		/** Output width in pixels */
		width: number;
		/** Output height in pixels */
		height: number;
	}) => EffectPass[];
}

export interface EffectDefinition {
	/** Effect type discriminator. */
	type: string;
	/** Human-readable effect name. */
	name: string;
	/** Search keywords for discovering the effect. */
	keywords: string[];
	/** Parameter definitions exposed by the effect. */
	params: ParamDefinition[];
	/** Renderer configuration for the effect. */
	renderer: EffectRendererConfig;
}
