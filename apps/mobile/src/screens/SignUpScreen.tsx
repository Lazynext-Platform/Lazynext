/**
 * Sign-up screen for mobile app.
 *
 * @module screens/SignUpScreen
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

/** Sign-up screen with name, email, and password registration form. */
export function SignUpScreen({ navigation }: { navigation: any }) {
	const { signUp } = useAuth();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleSignUp = async () => {
		setError("");
		if (!name || !email || !password) {
			setError("Please fill in all fields");
			return;
		}
		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}
		if (password !== confirmPassword) {
			setError("Passwords do not match");
			return;
		}
		setLoading(true);
		const result = await signUp(name, email, password);
		if (result.error) {
			setError(result.error.message || "Sign up failed");
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
					<Text style={styles.subtitle}>Create your account</Text>
				</View>

				<View style={styles.card}>
					{error ? <Text style={styles.errorText}>{error}</Text> : null}

					<Text style={styles.label}>Name</Text>
					<TextInput
						style={styles.input}
						value={name}
						onChangeText={setName}
						placeholder="Your name"
						placeholderTextColor="#52525b"
						autoComplete="name"
					/>

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
						onPress={handleSignUp}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator color="#050505" />
						) : (
							<Text style={styles.buttonText}>Create Account</Text>
						)}
					</TouchableOpacity>

					<TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
						<Text style={styles.switchText}>
							Already have an account?{" "}
							<Text style={styles.link}>Sign In</Text>
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
