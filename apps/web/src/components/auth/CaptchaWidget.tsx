/**
 * Cloudflare Turnstile widget wrapper.
 *
 * Renders an invisible Turnstile CAPTCHA. The widget automatically
 * refreshes its token when it expires. When CAPTCHA is not configured
 * (no site key), nothing is rendered and verification is skipped.
 *
 * @module components/auth/CaptchaWidget
 */

"use client";

import Turnstile, { useTurnstile } from "react-turnstile";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

interface CaptchaWidgetProps {
	/** Called with the Turnstile token when the widget succeeds. */
	onVerify: (token: string) => void;
	/** Called when the widget expires or fails. */
	onError?: () => void;
	/** Whether the widget is disabled (e.g., during form submission). */
	disabled?: boolean;
}

export function CaptchaWidget({
	onVerify,
	onError,
	disabled: _disabled,
}: CaptchaWidgetProps) {
	if (!siteKey) return null;

	return (
		<div className="flex justify-center">
			<Turnstile
				sitekey={siteKey}
				onVerify={onVerify}
				onError={onError}
				onExpire={onError}
				theme="auto"
				size="normal"
				refreshExpired="auto"
			/>
		</div>
	);
}

/**
 * Hook that provides a `resetCaptcha` function to reset the widget
 * (e.g., after a failed form submission).
 */
export function useCaptchaReset() {
	const turnstile = useTurnstile();
	return () => turnstile.reset();
}
