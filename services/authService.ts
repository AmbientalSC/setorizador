import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { app } from './firebaseService';

const auth = getAuth(app);

export const login = async (email: string, password: string): Promise<User> => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (err: any) {
        // Log detailed info to help debugging in browser console
        // Firebase errors expose `code` (like 'auth/wrong-password') and `message`.
        console.error('Firebase login error', {
            code: err?.code,
            message: err?.message,
            name: err?.name,
            stack: err?.stack,
        });
        // Temporary debug: call the REST endpoint directly with same payload to compare
        try {
            const apiKey = (app as any)?.options?.apiKey || 'UNKNOWN_API_KEY';
            const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
            const body = JSON.stringify({ email, password, returnSecureToken: true });
            console.log('[AUTH DEBUG] Performing fallback REST call to Identity Toolkit', { url, body });
            fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
                .then(async (res) => {
                    const text = await res.text();
                    let parsed;
                    try { parsed = JSON.parse(text); } catch (e) { parsed = text; }
                    console.log('[AUTH DEBUG] Fallback REST response status:', res.status);
                    console.log('[AUTH DEBUG] Fallback REST response body:', parsed);
                }).catch((fetchErr) => {
                    console.error('[AUTH DEBUG] Fallback REST fetch error', fetchErr);
                });
        } catch (e) {
            console.error('[AUTH DEBUG] Error while attempting fallback REST call', e);
        }
        // Re-throw to let UI handle and show a friendly message
        throw err;
    }
};

export const logout = async (): Promise<void> => {
    await signOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};

export { auth };
