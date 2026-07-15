/**
 * Sign-in screen for mobile app with email/password,
 * magic link, and social OAuth (Google/Apple/Microsoft).
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
	Linking,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";

export function SignInScreen({ navigation }: { navigation: any }) {
	const { signIn, signInWithMagicLink, signInWithOAuth } = useAuth();
	const [mode, setMode] = useState<"password" | "magicLink">("password");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [oauthLoading, setOauthLoading] = useState<string | null>(null);

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

	const handleMagicLink = async () => {
		if (!email) {
			setError("Please enter your email address");
			return;
		}
		setLoading(true);
		setError("");
		const result = await signInWithMagicLink(email);
		if (result.error) {
			setError(result.error.message || "Could not send magic link");
		} else {
			setError("");
			setPassword("");
		}
		setLoading(false);
	};

	const handleOAuth = async (provider: "google" | "apple" | "microsoft") => {
		setOauthLoading(provider);
		setError("");
		try {
			const result = await signInWithOAuth(provider);
			if (result.error) {
				setError(result.error.message || `Could not sign in with ${provider}`);
			}
		} catch {
			setError(`Could not sign in with ${provider}`);
		} finally {
			setOauthLoading(null);
		}
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

					{mode === "password" && (
						<>
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
						</>
					)}

					<TouchableOpacity
						style={[styles.button, loading && styles.buttonDisabled]}
						onPress={mode === "password" ? handleSignIn : handleMagicLink}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator color="#050505" />
						) : (
							<Text style={styles.buttonText}>
								{mode === "password" ? "Sign In" : "Send Magic Link"}
							</Text>
						)}
					</TouchableOpacity>

					<TouchableOpacity
						onPress={() => {
							setMode(mode === "password" ? "magicLink" : "password");
							setError("");
						}}
					>
						<Text style={styles.switchModeText}>
							{mode === "password"
								? "Sign in with magic link instead"
								: "Sign in with password instead"}
						</Text>
					</TouchableOpacity>

					{/* ── Social Auth Buttons ──────────────────── */}
					<View style={styles.dividerRow}>
						<View style={styles.divider} />
						<Text style={styles.dividerText}>or continue with</Text>
						<View style={styles.divider} />
					</View>

					<View style={styles.socialRow}>
						<TouchableOpacity
							style={styles.socialButton}
							onPress={() => handleOAuth("google")}
							disabled={oauthLoading !== null}
						>
							{oauthLoading === "google" ? (
								<ActivityIndicator color="#fff" size="small" />
							) : (
								<Text style={styles.socialButtonText}>G</Text>
							)}
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.socialButton}
							onPress={() => handleOAuth("apple")}
							disabled={oauthLoading !== null}
						>
							{oauthLoading === "apple" ? (
								<ActivityIndicator color="#fff" size="small" />
							) : (
								<Text style={styles.socialButtonText}>A</Text>
							)}
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.socialButton}
							onPress={() => handleOAuth("microsoft")}
							disabled={oauthLoading !== null}
						>
							{oauthLoading === "microsoft" ? (
								<ActivityIndicator color="#fff" size="small" />
							) : (
								<Text style={styles.socialButtonText}>M</Text>
							)}
						</TouchableOpacity>
					</View>

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
	switchModeText: {
		color: "#00e5ff",
		fontSize: 13,
		textAlign: "center",
		marginTop: 12,
	},
	switchText: {
		color: "rgba(255,255,255,0.5)",
		fontSize: 13,
		textAlign: "center",
		marginTop: 16,
	},
	dividerRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 20,
		marginBottom: 12,
	},
	divider: {
		flex: 1,
		height: 1,
		backgroundColor: "rgba(255,255,255,0.1)",
	},
	dividerText: {
		color: "rgba(255,255,255,0.3)",
		fontSize: 11,
		marginHorizontal: 12,
		textTransform: "uppercase",
	},
	socialRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 12,
	},
	socialButton: {
		backgroundColor: "rgba(255,255,255,0.08)",
		width: 56,
		height: 44,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.1)",
	},
	socialButtonText: {
		color: "#fff",
		fontSize: 16,
		fontWeight: "700",
	},
});
