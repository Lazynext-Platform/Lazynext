/**
 * Passkey Registration Screen — registers a new WebAuthn passkey
 * for biometric authentication (fingerprint, face, device PIN).
 *
 * @module screens/PasskeyRegisterScreen
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
} from "react-native";
import { registerPasskey } from "../services/auth";

/** React component rendering PasskeyRegisterScreen. */
export function PasskeyRegisterScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
	const [name, setName] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const handleRegister = async () => {
		setLoading(true);
		setError("");
		try {
			const result = await registerPasskey(
				name || `Passkey (${new Date().toLocaleDateString()})`,
			);
			if (result.error) {
				setError(result.error.message || "Could not create passkey");
			} else {
				navigation.goBack();
			}
		} catch {
			setError("Could not create passkey. Your device may not support passkeys.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.card}>
				<Text style={styles.title}>Create Passkey</Text>
				<Text style={styles.subtitle}>
					Use your fingerprint, face, or device PIN to sign in securely.
					Passkeys are phishing-resistant and sync across your devices.
				</Text>

				{error ? <Text style={styles.errorText}>{error}</Text> : null}

				<Text style={styles.label}>Passkey Name (optional)</Text>
				<TextInput
					style={styles.input}
					value={name}
					onChangeText={setName}
					placeholder="e.g. iPhone 15 Pro"
					placeholderTextColor="#52525b"
				/>

				<TouchableOpacity
					style={[styles.button, loading && styles.buttonDisabled]}
					onPress={handleRegister}
					disabled={loading}
				>
					{loading ? (
						<ActivityIndicator color="#050505" />
					) : (
						<Text style={styles.buttonText}>Create Passkey</Text>
					)}
				</TouchableOpacity>

				<TouchableOpacity onPress={() => navigation.goBack()}>
					<Text style={styles.cancelLink}>Cancel</Text>
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
	},
	title: { fontSize: 20, fontWeight: "700", color: theme.textPrimary, marginBottom: 8 },
	subtitle: {
		color: theme.textMuted,
		fontSize: 14,
		marginBottom: 20,
		lineHeight: 20,
	},
	errorText: { color: "#ef4444", fontSize: 13, marginBottom: 12 },
	label: {
		color: theme.textMuted,
		fontSize: 12,
		fontWeight: "600",
		marginBottom: 6,
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
		marginBottom: 20,
	},
	button: {
		backgroundColor: theme.accentPrimary,
		paddingVertical: 14,
		borderRadius: 12,
		alignItems: "center",
	},
	buttonDisabled: { opacity: 0.4 },
	buttonText: { color: theme.textOnAccent, fontWeight: "bold", fontSize: 16 },
	cancelLink: { color: theme.textMuted, fontSize: 14, textAlign: "center", marginTop: 16 },
});
