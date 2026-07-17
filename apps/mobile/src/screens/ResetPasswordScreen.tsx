/**
 * Reset password screen for mobile app.
 *
 * @module screens/ResetPasswordScreen
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
	ScrollView,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

/** Reset password screen — accepts a new password and token from the reset link. */
export function ResetPasswordScreen({
	navigation,
	route,
}: {
	navigation: any;
	route: any;
}) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
	const { resetPassword } = useAuth();
	const token = route?.params?.token || "";
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleReset = async () => {
		setError("");
		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}
		if (!token) {
			setError("Invalid reset link. Please request a new one.");
			return;
		}
		setLoading(true);
		const result = await resetPassword(password, token);
		if (!result.error) {
			navigation.navigate("SignIn");
		} else {
			setError(result.error.message || "Invalid or expired reset token");
		}
		setLoading(false);
	};

	if (!token) {
		return (
			<View style={styles.container}>
				<View style={styles.inner}>
					<View style={styles.header}>
						<Text style={styles.title}>
							LAZYNEXT<Text style={styles.cyan}>.</Text>
						</Text>
					</View>
					<View style={styles.card}>
						<Text style={styles.errorText}>Invalid reset link</Text>
						<Text style={styles.description}>
							Please request a new password reset link.
						</Text>
						<TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
							<Text style={styles.link}>Request new reset link</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		);
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === "ios" ? "padding" : undefined}
		>
			<ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
				<View style={styles.header}>
					<Text style={styles.title}>
						LAZYNEXT<Text style={styles.cyan}>.</Text>
					</Text>
					<Text style={styles.subtitle}>Set new password</Text>
				</View>

				<View style={styles.card}>
					{error ? <Text style={styles.errorText}>{error}</Text> : null}

					<Text style={styles.label}>New Password</Text>
					<TextInput
						style={styles.input}
						value={password}
						onChangeText={setPassword}
						placeholder="Min. 8 characters"
						placeholderTextColor="#52525b"
						secureTextEntry
						autoComplete="new-password"
					/>

					<Text style={styles.label}>Confirm Password</Text>
					<TextInput
						style={styles.input}
						value={confirmPassword}
						onChangeText={setConfirmPassword}
						placeholder="Re-enter your password"
						placeholderTextColor="#52525b"
						secureTextEntry
						autoComplete="new-password"
					/>

					<TouchableOpacity
						style={[styles.button, loading && styles.buttonDisabled]}
						onPress={handleReset}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator color="#050505" />
						) : (
							<Text style={styles.buttonText}>Reset Password</Text>
						)}
					</TouchableOpacity>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const getStyles = (theme: Theme) => StyleSheet.create({
	container: { flex: 1, backgroundColor: theme.bgMain },
	inner: { flexGrow: 1, justifyContent: "center", padding: 24 },
	header: { alignItems: "center", marginBottom: 32 },
	title: { fontSize: 32, fontWeight: "900", color: theme.textPrimary, letterSpacing: -1 },
	cyan: { color: theme.accentPrimary },
	subtitle: { color: theme.textSecondary, marginTop: 8, fontSize: 15 },
	card: {
		backgroundColor: theme.bgPanel,
		borderRadius: 24,
		padding: 24,
		borderWidth: 1,
		borderColor: theme.borderGlass,
	},
	description: {
		color: theme.textSecondary,
		fontSize: 14,
		textAlign: "center",
		marginBottom: 16,
	},
	errorText: {
		color: "#ef4444",
		fontSize: 13,
		marginBottom: 12,
		textAlign: "center",
	},
	label: {
		color: theme.textMuted,
		fontSize: 12,
		fontWeight: "600",
		marginBottom: 6,
		marginTop: 12,
	},
	input: {
		backgroundColor: theme.bgHover,
		color: theme.textPrimary,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: theme.borderGlass,
		fontSize: 15,
	},
	link: {
		color: theme.accentPrimary,
		fontSize: 14,
		textAlign: "center",
		marginTop: 16,
	},
	button: {
		backgroundColor: theme.accentPrimary,
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
		marginTop: 20,
	},
	buttonDisabled: { opacity: 0.4 },
	buttonText: { color: theme.textOnAccent, fontWeight: "bold", fontSize: 16 },
});
