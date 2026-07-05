/**
 * Forgot password screen for mobile app.
 *
 * @module screens/ForgotPasswordScreen
 */

import React, { useState } from "react";
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

export function ForgotPasswordScreen({ navigation }: { navigation: any }) {
	const { requestPasswordReset } = useAuth();
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState("");

	const handleRequest = async () => {
		if (!email) {
			setError("Please enter your email");
			return;
		}
		setLoading(true);
		setError("");
		const result = await requestPasswordReset(email);
		if (!result.error) {
			setSent(true);
		} else {
			setError(result.error.message || "Failed to send reset email");
		}
		setLoading(false);
	};

	if (sent) {
		return (
			<View style={styles.container}>
				<View style={styles.inner}>
					<View style={styles.header}>
						<Text style={styles.title}>
							LAZYNEXT<Text style={styles.cyan}>.</Text>
						</Text>
					</View>
					<View style={styles.card}>
						<Text style={styles.successTitle}>Check your email</Text>
						<Text style={styles.successText}>
							We sent a password reset link if that account exists.
						</Text>
						<TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
							<Text style={styles.link}>Back to Sign In</Text>
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
					<Text style={styles.subtitle}>Reset your password</Text>
				</View>

				<View style={styles.card}>
					<Text style={styles.description}>
						Enter your email and we&apos;ll send you a reset link.
					</Text>

					{error ? <Text style={styles.errorText}>{error}</Text> : null}

					<Text style={styles.label}>Email</Text>
					<TextInput
						style={styles.input}
						value={email}
						onChangeText={setEmail}
						placeholder="you@example.com"
						placeholderTextColor="#52525b"
						keyboardType="email-address"
						autoCapitalize="none"
						autoComplete="email"
					/>

					<TouchableOpacity
						style={[styles.button, loading && styles.buttonDisabled]}
						onPress={handleRequest}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator color="#050505" />
						) : (
							<Text style={styles.buttonText}>Send Reset Link</Text>
						)}
					</TouchableOpacity>

					<TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
						<Text style={styles.switchText}>Back to Sign In</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#050505" },
	inner: { flexGrow: 1, justifyContent: "center", padding: 24 },
	header: { alignItems: "center", marginBottom: 32 },
	title: { fontSize: 32, fontWeight: "900", color: "#fff", letterSpacing: -1 },
	cyan: { color: "#00e5ff" },
	subtitle: { color: "rgba(255,255,255,0.6)", marginTop: 8, fontSize: 15 },
	card: {
		backgroundColor: "rgba(24,24,27,0.5)",
		borderRadius: 24,
		padding: 24,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.08)",
	},
	description: {
		color: "rgba(255,255,255,0.6)",
		fontSize: 14,
		marginBottom: 16,
		textAlign: "center",
	},
	errorText: {
		color: "#ef4444",
		fontSize: 13,
		marginBottom: 12,
		textAlign: "center",
	},
	successTitle: {
		color: "#00e5ff",
		fontSize: 20,
		fontWeight: "bold",
		textAlign: "center",
		marginBottom: 8,
	},
	successText: {
		color: "rgba(255,255,255,0.6)",
		fontSize: 14,
		textAlign: "center",
		marginBottom: 20,
	},
	label: {
		color: "rgba(255,255,255,0.5)",
		fontSize: 12,
		fontWeight: "600",
		marginBottom: 6,
		marginTop: 12,
	},
	input: {
		backgroundColor: "rgba(255,255,255,0.05)",
		color: "#fff",
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.08)",
		fontSize: 15,
	},
	link: {
		color: "#00e5ff",
		fontSize: 14,
		textAlign: "center",
		marginTop: 16,
	},
	button: {
		backgroundColor: "#00e5ff",
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
		marginTop: 20,
	},
	buttonDisabled: { opacity: 0.4 },
	buttonText: { color: "#050505", fontWeight: "bold", fontSize: 16 },
	switchText: {
		color: "rgba(255,255,255,0.5)",
		fontSize: 13,
		textAlign: "center",
		marginTop: 16,
	},
});
