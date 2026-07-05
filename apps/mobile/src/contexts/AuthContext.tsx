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
	session: Session | null;
	isLoading: boolean;
	signIn: (email: string, password: string) => Promise<AuthResponse>;
	signUp: (
		name: string,
		email: string,
		password: string,
	) => Promise<AuthResponse>;
	signOut: () => Promise<void>;
	requestPasswordReset: (email: string) => Promise<AuthResponse>;
	resetPassword: (
		newPassword: string,
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

export function useAuth(): AuthContextValue {
	return useContext(AuthContext);
}
