/**
 * Passkey Authentication Screen — signs in using a previously
 * registered WebAuthn passkey (fingerprint, face, device PIN).
 *
 * @module screens/PasskeySignInScreen
 */

import React, { useState } from "react";
import { useTheme, Theme } from "../theme";
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
} from "react-native";
import { authenticateWithPasskey } from "../services/auth";
import { useAuth } from "../contexts/AuthContext";

/** React component rendering PasskeySignInScreen. */
export function PasskeySignInScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
	const { session } = useAuth();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handlePasskeySignIn = async () => {
		setLoading(true);
		setError("");
		try {
			// Passkey auth — generates a challenge, user verifies with biometrics
			const challenge = Math.random().toString(36).substring(2, 15);
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

const getStyles = (theme: Theme) => StyleSheet.create({
	container: { flex: 1, backgroundColor: theme.bgMain, padding: 24, justifyContent: "center" },
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
		marginBottom: 24,
	},
	errorText: { color: "#ef4444", fontSize: 13, marginBottom: 12 },
	passkeyButton: {
		backgroundColor: theme.borderGlass,
		paddingVertical: 20,
		paddingHorizontal: 32,
		borderRadius: 16,
		borderWidth: 2,
		borderColor: theme.borderGlass,
		alignItems: "center",
		gap: 8,
		width: "100%",
	},
	buttonDisabled: { opacity: 0.4 },
	fingerprintEmoji: { fontSize: 32 },
	passkeyButtonText: { color: theme.textPrimary, fontSize: 16, fontWeight: "600" },
	altLink: { color: theme.accentPrimary, fontSize: 14, marginTop: 20 },
});
