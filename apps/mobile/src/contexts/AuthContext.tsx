/**
 * Auth context — provides session state, signIn, signUp, signOut,
 * requestPasswordReset, and resetPassword to all screens.
 *
 * @module contexts/AuthContext
 */

import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
} from "react";
import type { ReactNode } from "react";
import {
	signIn as apiSignIn,
	signUp as apiSignUp,
	signOut as apiSignOut,
	requestPasswordReset as apiRequestPasswordReset,
	resetPassword as apiResetPassword,
	getSession,
	getStoredSession,
	type Session,
	type AuthResponse,
} from "../services/auth";

interface AuthContextValue {
	/** Current session data or null. */
	session: Session | null;
	/** Whether auth is initializing. */
	isLoading: boolean;
	/** Signs in with email and password. */
	signIn: (email: string, password: string) => Promise<AuthResponse>;
	/** Signs up a new account. */
	signUp: (
		/** Display name for the new account. */
		name: string,
		/** Account email address. */
		email: string,
		/** Account password. */
		password: string,
	) => Promise<AuthResponse>;
	/** Signs out the current session. */
	signOut: () => Promise<void>;
	/** Requests a password reset email. */
	requestPasswordReset: (email: string) => Promise<AuthResponse>;
	/** Resets the password with a token. */
	resetPassword: (
		/** The new password to set. */
		newPassword: string,
		/** Password-reset token from the reset email. */
		token: string,
	) => Promise<AuthResponse>;
}

const AuthContext = createContext<AuthContextValue>({
	session: null,
	isLoading: true,
	signIn: async () => ({ error: { message: "Auth not initialized" } }),
	signUp: async () => ({ error: { message: "Auth not initialized" } }),
	signOut: async () => {},
	requestPasswordReset: async () => ({
		error: { message: "Auth not initialized" },
	}),
	resetPassword: async () => ({ error: { message: "Auth not initialized" } }),
});

/** Provides auth state (user, session, token) to the component tree via React context. */
export function AuthProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<Session | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const init = async () => {
			try {
				const stored = getStoredSession();
				if (stored?.token) {
					const sess = await getSession();
					if (sess) {
						setSession(sess);
					}
				}
			} catch {
				// Ignore init errors
			} finally {
				setIsLoading(false);
			}
		};
		init();
	}, []);

	const handleSignIn = useCallback(
		async (email: string, password: string) => {
			const result = await apiSignIn(email, password);
			if (!result.error) {
				const stored = getStoredSession();
				if (stored) setSession(stored);
			}
			return result;
		},
		[],
	);

	const handleSignUp = useCallback(
		async (name: string, email: string, password: string) => {
			const result = await apiSignUp(name, email, password);
			if (!result.error) {
				const stored = getStoredSession();
				if (stored) setSession(stored);
			}
			return result;
		},
		[],
	);

	const handleSignOut = useCallback(async () => {
		await apiSignOut();
		setSession(null);
	}, []);

	return (
		<AuthContext.Provider
			value={{
				session,
				isLoading,
				signIn: handleSignIn,
				signUp: handleSignUp,
				signOut: handleSignOut,
				requestPasswordReset: apiRequestPasswordReset,
				resetPassword: apiResetPassword,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
}

/** Hook to access the current auth context (user, session, loading, signIn, signOut, signUp). */
export function useAuth(): AuthContextValue {
	return useContext(AuthContext);
}
