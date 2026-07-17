/**
 * Two-Factor Verification Screen — shown after sign-in when
 * the account has 2FA/MFA enabled. Prompts for TOTP code.
 *
 * @module screens/TwoFactorScreen
 */

import React, { useState } from "react";
import { useTheme, Theme } from "../theme";
import {
	View,
	Text,
	TextInput,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

/** React component rendering TwoFactorScreen. */
export function TwoFactorScreen({ navigation, route }: { navigation: any; route: any }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
	const { verifyTwoFactor } = useAuth();
	const { email, password } = route.params || {};
	const [code, setCode] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleVerify = async () => {
		if (code.length !== 6) {
			setError("Enter the 6-digit verification code");
			return;
		}
		setLoading(true);
		setError("");
		const result = await verifyTwoFactor(code);
		if (result.error) {
			setError(result.error.message || "Invalid verification code");
		}
		setLoading(false);
	};

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<View style={styles.inner}>
				<View style={styles.card}>
					<Text style={styles.title}>Two-Factor Authentication</Text>
					<Text style={styles.subtitle}>
						Enter the 6-digit verification code from your authenticator app.
					</Text>

					{error ? <Text style={styles.errorText}>{error}</Text> : null}

					<TextInput
						style={styles.codeInput}
						value={code}
						onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
						placeholder="000000"
						placeholderTextColor={theme.textMuted}
						keyboardType="number-pad"
						maxLength={6}
						autoFocus
						textAlign="center"
					/>

					<TouchableOpacity
						style={[styles.button, loading && styles.buttonDisabled]}
						onPress={handleVerify}
						disabled={loading || code.length !== 6}
					>
						{loading ? (
							<ActivityIndicator color={theme.textOnAccent} />
						) : (
							<Text style={styles.buttonText}>Verify & Sign In</Text>
						)}
					</TouchableOpacity>

					<TouchableOpacity onPress={() => navigation.goBack()}>
						<Text style={styles.backLink}>Back to Sign In</Text>
					</TouchableOpacity>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}

const getStyles = (theme: Theme) => StyleSheet.create({
	container: { flex: 1, backgroundColor: theme.bgMain },
	inner: { flex: 1, justifyContent: "center", padding: 24 },
	card: {
		backgroundColor: theme.bgPanel,
		borderRadius: 24,
		padding: 24,
		borderWidth: 1,
		borderColor: theme.borderGlass,
		alignItems: "center",
	},
	title: { fontSize: 20, fontWeight: "700", color: theme.textPrimary, marginBottom: 8 },
	subtitle: {
		color: theme.textMuted,
		fontSize: 14,
		textAlign: "center",
		marginBottom: 20,
	},
	errorText: { color: theme.accentSecondary, fontSize: 13, marginBottom: 12 },
	codeInput: {
		backgroundColor: theme.bgHover,
		color: theme.textPrimary,
		fontSize: 28,
		fontWeight: "700",
		letterSpacing: 10,
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: theme.borderGlass,
		width: "100%",
		marginBottom: 20,
	},
	button: {
		backgroundColor: theme.accentPrimary,
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
		width: "100%",
	},
	buttonDisabled: { opacity: 0.4 },
	buttonText: { color: theme.textOnAccent, fontWeight: "bold", fontSize: 16 },
	backLink: {
		color: theme.accentPrimary,
		fontSize: 14,
		marginTop: 16,
	},
});
