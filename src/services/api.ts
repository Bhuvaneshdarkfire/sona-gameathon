// ─── Backend API Service ────────────────────────────────────────
// Wrapper for calling the Express backend APIs.
// Uses Firebase Auth tokens for authenticated requests.

import { auth } from '../firebase';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * Get the current user's Firebase ID token for API auth.
 */
async function getAuthToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) throw new Error('Not logged in');
    return user.getIdToken();
}

/**
 * Authenticated fetch wrapper.
 */
async function apiFetch(endpoint: string, options: RequestInit = {}) {
    const token = await getAuthToken();
    let res: Response;
    try {
        res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`,
                ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            },
        });
    } catch (err: any) {
        throw new Error('Cannot connect to the server. Please ensure the backend is running.');
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        throw new Error(
            `Server returned an unexpected response (${res.status}). ` +
            'Please ensure the backend server is running on port 5000.'
        );
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.status}`);
    return data;
}

/**
 * Public fetch (no auth needed).
 */
async function publicFetch(endpoint: string) {
    let res: Response;
    try {
        res = await fetch(`${API_BASE}${endpoint}`);
    } catch {
        throw new Error('Cannot connect to the server. Please ensure the backend is running.');
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        throw new Error(
            `Server returned an unexpected response (${res.status}). ` +
            'Please ensure the backend server is running on port 5000.'
        );
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `API error: ${res.status}`);
    return data;
}

// ─── Submissions ────────────────────────────────────────────────

/**
 * Upload a .zip model submission.
 */
export async function uploadSubmission(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/submissions/upload', {
        method: 'POST',
        body: formData,
    });
}

/**
 * Get submission history for a team.
 */
export async function getSubmissions(teamId: string) {
    return apiFetch(`/submissions/${teamId}`);
}

/**
 * Check build status of a submission.
 */
export async function getSubmissionStatus(submissionId: string) {
    return apiFetch(`/submissions/status/${submissionId}`);
}

// ─── Matches ────────────────────────────────────────────────────

/**
 * List all matches (public).
 */
export async function listMatches(status?: string) {
    const query = status ? `?status=${status}` : '';
    return publicFetch(`/matches${query}`);
}

/**
 * Create a match (admin).
 */
export async function createMatch(matchData: {
    matchNumber: number;
    team1: string;
    team2: string;
    stadium: string;
    tossWinner?: string;
    tossDecision?: string;
}) {
    return apiFetch('/matches', {
        method: 'POST',
        body: JSON.stringify(matchData),
    });
}

/**
 * Update a match with actual scores (admin).
 */
export async function updateMatch(matchId: string, updates: {
    actualRunsInning1?: number;
    actualRunsInning2?: number;
    status?: string;
    tossWinner?: string;
    tossDecision?: string;
}) {
    return apiFetch(`/matches/${matchId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
    });
}

/**
 * Trigger evaluation for a match (admin).
 */
export async function evaluateMatch(matchId: string) {
    return apiFetch(`/matches/evaluate/${matchId}`, {
        method: 'POST',
    });
}

/**
 * Get predictions for a match (public).
 */
export async function getPredictions(matchId: string) {
    return publicFetch(`/matches/predictions/${matchId}`);
}

// ─── Leaderboard ────────────────────────────────────────────────

/**
 * Get the ranked leaderboard.
 */
export async function getLeaderboard() {
    return publicFetch('/leaderboard');
}

/**
 * Health check (public).
 */
export async function getHealthCheck() {
    return publicFetch('/leaderboard/health');
}

// ─── Match CSV Upload ───────────────────────────────────────────

/**
 * Upload CSV match data for a specific match (admin).
 */
export async function uploadMatchCSV(matchId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch(`/matches/${matchId}/csv`, {
        method: 'POST',
        body: formData,
    });
}

/**
 * Get parsed match data (from CSV) for a match.
 */
export async function getMatchData(matchId: string) {
    return publicFetch(`/matches/${matchId}/data`);
}

// ─── Team Predictions ───────────────────────────────────────────

/**
 * Get all predictions for a team across all matches.
 */
export async function getTeamPredictions(teamId: string) {
    return apiFetch(`/team-predictions/${teamId}`);
}
