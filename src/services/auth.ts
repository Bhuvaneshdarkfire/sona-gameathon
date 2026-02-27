import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    onAuthStateChanged,
    type User,
} from "firebase/auth";
import { auth } from "../firebase";

// ─── Login ────────────────────────────────────────────────────
export async function loginUser(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
}

// ─── Create account (admin calls this during approval) ────────
export async function createUserAccount(email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user;
}

// ─── Logout ───────────────────────────────────────────────────
export async function logoutUser() {
    await signOut(auth);
}

// ─── Change Password ─────────────────────────────────────────
export async function changeUserPassword(oldPassword: string, newPassword: string) {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("Not logged in");

    const credential = EmailAuthProvider.credential(user.email, oldPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
}

// ─── Auth State Listener ─────────────────────────────────────
export function onAuthChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
}

// ─── Get current user ────────────────────────────────────────
export function getCurrentUser() {
    return auth.currentUser;
}
