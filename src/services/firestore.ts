import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth } from "../firebase";

// ─── Collections ──────────────────────────────────────────────
const teamsCol = () => collection(db, "teams");
const settingsCol = () => collection(db, "settings");
const announcementsCol = () => collection(db, "announcements");

// ─── 1. PUBLIC: Leaderboard + Settings ────────────────────────
export async function getPublicData() {
    // Payment mode setting
    const pmSnap = await getDoc(doc(db, "settings", "payment_mode"));
    const paymentEnabled = pmSnap.exists() ? pmSnap.data().value : false;

    // Leaderboard: approved teams sorted by score desc
    const q = query(
        teamsCol(),
        where("role", "==", "user"),
        where("status", "==", "Approved")
    );
    const snap = await getDocs(q);
    const leaderboard = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => (a.cumulativeError ?? Infinity) - (b.cumulativeError ?? Infinity))
        .map((t: any) => ({
            teamName: t.teamName,
            institute: t.institute,
            score: t.score ?? 0,
            cumulativeError: t.cumulativeError ?? null,
            matchesEvaluated: t.matchesEvaluated ?? 0,
        }));

    return { paymentEnabled, leaderboard };
}

// ─── 2. REGISTER ──────────────────────────────────────────────
export async function registerTeam(data: {
    teamName: string;
    institute: string;
    captainName: string;
    captainEmail: string;
    password: string;
}) {
    // Check if email exists in Firestore
    const q = query(teamsCol(), where("captainEmail", "==", data.captainEmail));
    const existing = await getDocs(q);
    if (!existing.empty) throw new Error("Email already registered");

    // Create Firebase Auth account immediately with user-chosen password
    const cred = await createUserWithEmailAndPassword(auth, data.captainEmail, data.password);
    const uid = cred.user.uid;

    // Sign out the newly created user so they can't access the app before approval
    await signOut(auth);

    // Store the team in Firestore with the UID already linked
    const { password, ...teamData } = data;
    await addDoc(teamsCol(), {
        ...teamData,
        members: [data.captainName, "", "", "", "", ""],
        score: 0,
        role: "user",
        status: "Pending",
        editCount: 0,
        maxEdits: 2,
        uid,
        createdAt: Timestamp.now(),
    });
}

// ─── 3. Get team by UID (for logged-in users) ─────────────────
export async function getTeamByUid(uid: string) {
    const q = query(teamsCol(), where("uid", "==", uid));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { _id: d.id, ...d.data() };
}

// ─── 4. Get team by email ─────────────────────────────────────
export async function getTeamByEmail(email: string) {
    const q = query(teamsCol(), where("captainEmail", "==", email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { _id: d.id, ...d.data() };
}

// ─── 5. USER DASHBOARD DATA ──────────────────────────────────
export async function getUserDashboard(uid: string) {
    const team: any = await getTeamByUid(uid);
    if (!team) throw new Error("Team not found");

    // Rank calculation
    const q = query(
        teamsCol(),
        where("role", "==", "user"),
        where("status", "==", "Approved")
    );
    const allSnap = await getDocs(q);
    const allTeams = allSnap.docs
        .map((d) => ({ id: d.id, ...d.data() } as any))
        .sort((a: any, b: any) => (a.cumulativeError ?? Infinity) - (b.cumulativeError ?? Infinity));

    const rank = allTeams.findIndex((t: any) => t.id === team._id) + 1;

    // Announcements
    const annSnap = await getDocs(
        query(announcementsCol(), orderBy("timestamp", "desc"))
    );
    const announcements = annSnap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
    }));

    // Payment settings
    const pmSnap = await getDoc(doc(db, "settings", "payment_mode"));
    const paSnap = await getDoc(doc(db, "settings", "payment_amount"));

    return {
        team,
        rank,
        announcements,
        payment: {
            enabled: pmSnap.exists() ? pmSnap.data().value : false,
            amount: paSnap.exists() ? paSnap.data().value : 0,
        },
        dreamTeam: ["Player A", "Player B", "Player C"],
    };
}

// ─── 6. UPDATE MEMBERS ───────────────────────────────────────
export async function updateMembers(teamId: string, members: string[]) {
    const ref = doc(db, "teams", teamId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error("Team not found");

    const data = snap.data();
    if ((data.editCount ?? 0) >= (data.maxEdits ?? 2))
        throw new Error("Edit limit reached.");

    await updateDoc(ref, {
        members,
        editCount: (data.editCount ?? 0) + 1,
    });

    return { success: true, editsLeft: (data.maxEdits ?? 2) - (data.editCount ?? 0) - 1 };
}

// ─── 7. ADMIN DATA ───────────────────────────────────────────
export async function getAdminData() {
    const teamsSnap = await getDocs(query(teamsCol(), where("role", "==", "user")));
    const teams = teamsSnap.docs.map((d) => ({ _id: d.id, ...d.data() }));

    const settSnap = await getDocs(settingsCol());
    const settings = settSnap.docs.map((d) => ({ key: d.id, ...d.data() }));

    const annSnap = await getDocs(
        query(announcementsCol(), orderBy("timestamp", "desc"))
    );
    const announcements = annSnap.docs.map((d) => ({ _id: d.id, ...d.data() }));

    return { teams, settings, announcements };
}

// ─── 8. ADMIN: Approve team (set status, link UID) ───────────
export async function approveTeam(teamId: string, uid: string) {
    const ref = doc(db, "teams", teamId);
    await updateDoc(ref, { status: "Approved", uid });
}

// ─── 9. ADMIN: Post Announcement ─────────────────────────────
export async function postAnnouncement(message: string) {
    await addDoc(announcementsCol(), {
        message,
        timestamp: Timestamp.now(),
    });
}

// ─── 10. ADMIN: Save Setting ─────────────────────────────────
export async function saveSetting(key: string, value: any) {
    await setDoc(doc(db, "settings", key), { value }, { merge: true });
}

// ─── 11. ADMIN: Kick / Score ─────────────────────────────────
export async function adminAction(
    action: string,
    teamId: string,
    value?: any
) {
    const ref = doc(db, "teams", teamId);
    if (action === "kick") {
        await deleteDoc(ref);
    } else if (action === "score") {
        await updateDoc(ref, { score: Number(value) });
    }
}
