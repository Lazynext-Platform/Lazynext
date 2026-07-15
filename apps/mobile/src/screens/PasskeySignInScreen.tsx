/**
 * Passkey Authentication Screen — signs in using a previously
 * registered WebAuthn passkey (fingerprint, face, device PIN).
 *
 * @module screens/PasskeySignInScreen
 */

import React, { useState } from "react";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
} from "react-native";
import { authenticateWithPasskey } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";

export function PasskeySignInScreen({ navigation }: { navigation: any }) {
	const { session } = useAuth();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handlePasskeySignIn = async () => {
		setLoading(true);
		setError("");
		try {
			// Passkey auth — generates a challenge, user verifies with biometrics
			const challenge = crypto.randomUUID();
			const result = await authenticateWithPasskey(challenge);
			if (result.error) {
				setError(result.error.message || "Could not authenticate with passkey");
			}
		} catch {
			setError("Passkey authentication failed. Try another sign-in method.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				<Text style={styles.title}>Sign in with Passkey</Text>
				<Text style={styles.subtitle}>
					Use your fingerprint, face, or device PIN for quick, secure sign-in.
				</Text>

				{error ? <Text style={styles.errorText}>{error}</Text> : null}

				<TouchableOpacity
					style={[styles.passkeyButton, loading && styles.buttonDisabled]}
					onPress={handlePasskeySignIn}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="#fff" />
					) : (
						<>
							<Text style={styles.fingerprintEmoji}>🔑</Text>
							<Text style={styles.passkeyButtonText}>Use Passkey</Text>
						</>
					)}
				</TouchableOpacity>

				<TouchableOpacity onPress={() => navigation.navigate("SignIn")}>
					<Text style={styles.altLink}>Sign in with email instead</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: "#050505", padding: 24, justifyContent: "center" },
	card: {
		backgroundColor: "rgba(24,24,27,0.5)",
		borderRadius: 24,
		padding: 24,
		borderWidth: 1,
		borderColor: "rgba(255,255,255,0.08)",
		alignItems: "center",
	},
	title: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 8 },
	subtitle: {
		color: "rgba(255,255,255,0.5)",
		fontSize: 14,
		textAlign: "center",
		marginBottom: 24,
	},
	errorText: { color: "#ef4444", fontSize: 13, marginBottom: 12 },
	passkeyButton: {
		backgroundColor: "rgba(255,255,255,0.08)",
		paddingVertical: 20,
		paddingHorizontal: 32,
		borderRadius: 16,
		borderWidth: 2,
		borderColor: "rgba(255,255,255,0.15)",
		alignItems: "center",
		gap: 8,
		width: "100%",
	},
	buttonDisabled: { opacity: 0.4 },
	fingerprintEmoji: { fontSize: 32 },
	passkeyButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
	altLink: { color: "#00e5ff", fontSize: 14, marginTop: 20 },
});
