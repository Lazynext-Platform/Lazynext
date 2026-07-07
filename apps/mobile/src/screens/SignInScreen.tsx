/**
 * Sign-in screen for mobile app.
 *
 * @module screens/SignInScreen
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

/** Sign-in screen with email/password form and navigation to sign-up. */
export function SignInScreen({ navigation }: { navigation: any }) {
	const { signIn } = useAuth();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSignIn = async () => {
		if (!email || !password) {
			setError("Please enter your email and password");
			return;
		}
		setLoading(true);
		setError("");
		const result = await signIn(email, password);
		if (result.error) {
			setError(result.error.message || "Invalid email or password");
		}
		setLoading(false);
	};

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
					<Text style={styles.subtitle}>Sign in to your account</Text>
				</View>

				<View style={styles.card}>
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

					<Text style={styles.label}>Password</Text>
					<TextInput
						style={styles.input}
						value={password}
						onChangeText={setPassword}
						placeholder="••••••••"
						placeholderTextColor="#52525b"
						secureTextEntry
						autoComplete="password"
					/>

					<TouchableOpacity
						onPress={() => navigation.navigate("ForgotPassword")}
					>
						<Text style={styles.link}>Forgot password?</Text>
					</TouchableOpacity>

					<TouchableOpacity
						style={[styles.button, loading && styles.buttonDisabled]}
						onPress={handleSignIn}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator color="#050505" />
						) : (
							<Text style={styles.buttonText}>Sign In</Text>
						)}
					</TouchableOpacity>

					<TouchableOpacity onPress={() => navigation.navigate("SignUp")}>
						<Text style={styles.switchText}>
							Don&apos;t have an account?{" "}
							<Text style={styles.link}>Sign Up</Text>
						</Text>
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
	errorText: {
		color: "#ef4444",
		fontSize: 13,
		marginBottom: 12,
		textAlign: "center",
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
		fontSize: 13,
		textAlign: "right",
		marginTop: 8,
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
