// Inline script to prevent flash of unstyled content (FOUC)
// This runs before React hydrates, applying the correct theme immediately

export function ThemeScript() {
	return (
		<script
			dangerouslySetInnerHTML={{
				__html: `
					(function() {
						try {
							var theme = localStorage.getItem('theme');
							var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
							if (theme === 'dark' || (!theme && systemDark)) {
								document.documentElement.classList.add('dark');
							} else {
								document.documentElement.classList.remove('dark');
							}
						} catch(e) {}
					})();
				`,
			}}
		/>
	);
}
