import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { Shield, CheckCircle } from 'lucide-react';

const AdminSetup = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // 1. Create Firebase Auth account
            const cred = await createUserWithEmailAndPassword(auth, email, password);

            // 2. Create Firestore team doc with admin role
            await setDoc(doc(db, 'teams', cred.user.uid), {
                teamName: 'Admin',
                institute: 'Sona College of Technology',
                captainName: name || 'Admin',
                captainEmail: email,
                members: [],
                score: 0,
                role: 'admin',
                status: 'Approved',
                editCount: 0,
                maxEdits: 2,
                uid: cred.user.uid,
                createdAt: Timestamp.now(),
            });

            setDone(true);
        } catch (err: any) {
            setError(err.message || 'Failed to create admin account');
        } finally {
            setLoading(false);
        }
    };

    const inputCls = "w-full bg-gray-50 border border-gray-200 text-gray-900 p-3 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition placeholder-gray-400";

    if (done) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <div className="bg-white p-10 rounded-2xl w-full max-w-md border border-green-200 shadow-xl text-center">
                    <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Created!</h2>
                    <p className="text-gray-500 mb-2">Email: <span className="text-gray-900 font-mono">{email}</span></p>
                    <p className="text-gray-400 mb-6">You are now logged in as admin.</p>
                    <button onClick={() => navigate('/admin')} className="w-full bg-[#1e3a8a] hover:bg-blue-800 text-white py-3 rounded-xl font-bold transition">
                        Go to Admin Dashboard →
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <div className="bg-white p-8 rounded-2xl w-full max-w-md border border-gray-200 shadow-xl border-t-4 border-t-[#1e3a8a]">
                <div className="flex items-center justify-center gap-3 mb-6">
                    <Shield className="text-[#1e3a8a]" size={28} />
                    <h2 className="text-2xl font-bold text-gray-900">Create Admin Account</h2>
                </div>
                <p className="text-gray-400 text-sm text-center mb-6">One-time setup. This creates the admin user for your Sona PowerPredict app.</p>

                {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-4">{error}</div>}

                <form onSubmit={handleCreate} className="space-y-4">
                    <input type="text" placeholder="Your Name" required className={inputCls} value={name} onChange={e => setName(e.target.value)} />
                    <input type="email" placeholder="Admin Email" required className={inputCls} value={email} onChange={e => setEmail(e.target.value)} />
                    <input type="password" placeholder="Password (min 6 chars)" required minLength={6} className={inputCls} value={password} onChange={e => setPassword(e.target.value)} />
                    <button disabled={loading} className="w-full bg-[#1e3a8a] hover:bg-blue-800 text-white p-3 rounded-lg font-bold transition disabled:opacity-50">
                        {loading ? 'Creating...' : 'Create Admin Account'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminSetup;
