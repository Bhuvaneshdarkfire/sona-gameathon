import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, Users, UserCircle, Key, Megaphone, Bell,
  QrCode, Edit3, Star, Upload, CheckCircle,
  XCircle, Clock, FileArchive, Loader2
} from 'lucide-react';
import Modal from './Modal';
import { useAuth } from '../App';
import { getUserDashboard, updateMembers } from '../services/firestore';
import { changeUserPassword } from '../services/auth';
import { uploadSubmission, getSubmissions, getSubmissionStatus, getTeamPredictions } from '../services/api';

const UserDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'submissions' | 'updates' | 'profile'>('overview');

  // Squad Editing
  const [showEditModal, setShowEditModal] = useState(false);
  const [tempMembers, setTempMembers] = useState<string[]>([]);

  // Password & Alerts
  const [passData, setPassData] = useState({ old: '', new: '' });
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'success' | 'error' | 'info' });

  // Submission State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [teamPredictions, setTeamPredictions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadDashboard();
  }, [user, navigate]);

  // Poll submission build status
  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(async () => {
      try {
        const result = await getSubmissionStatus(pollingId);
        if (result.buildStatus !== 'building') {
          setPollingId(null);
          if (result.buildStatus === 'ready') {
            setModal({ isOpen: true, title: '🎉 Model Ready!', message: 'Your Docker image was built successfully. It will be used for the next evaluation.', type: 'success' });
          } else {
            setModal({ isOpen: true, title: '❌ Build Failed', message: `Docker build failed. Check the build log for details.\n\n${result.buildLog?.slice(-300) || ''}`, type: 'error' });
          }
          loadSubmissions();
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [pollingId]);

  const loadDashboard = async () => {
    if (!user) return;
    try {
      const d = await getUserDashboard(user.uid);
      setData(d);
      setTempMembers(d.team.members || []);
      loadSubmissions(d.team._id);
      loadPredictions(d.team._id);
    } catch {
      navigate('/login');
    }
  };

  const loadPredictions = async (teamId: string) => {
    try {
      const result = await getTeamPredictions(teamId);
      setTeamPredictions(result.predictions || []);
    } catch (err) {
      console.error('Predictions load error:', err);
    }
  };

  const loadSubmissions = async (teamId?: string) => {
    const id = teamId || data?.team?._id;
    if (!id) return;
    try {
      const result = await getSubmissions(id);
      setSubmissions(result.submissions || []);
    } catch (e) {
      console.error('Load submissions error:', e);
    }
  };

  // Save Team Members
  const saveMembers = async () => {
    try {
      const result = await updateMembers(data.team._id, tempMembers);
      if (result.success) {
        setModal({ isOpen: true, title: 'Squad Updated', message: `Saved! Edits remaining: ${result.editsLeft}`, type: 'success' });
        setShowEditModal(false);
        setData({ ...data, team: { ...data.team, members: tempMembers, editCount: data.team.editCount + 1 } });
      }
    } catch (e: any) {
      setModal({ isOpen: true, title: 'Update Failed', message: e.message, type: 'error' });
    }
  };

  // Upload Model
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.zip')) {
      setModal({ isOpen: true, title: 'Invalid File', message: 'Please upload a .zip file containing your mymodelfile.py.', type: 'error' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setModal({ isOpen: true, title: 'File Too Large', message: 'Max file size is 5MB.', type: 'error' });
      return;
    }

    setUploading(true);
    setUploadProgress('Uploading...');

    try {
      await uploadSubmission(file);
      setModal({ isOpen: true, title: '✅ Model Uploaded!', message: 'Your mymodelfile.py has been uploaded and is ready for evaluation. It will be run against upcoming matches when the admin triggers evaluation.', type: 'success' });
      if (data?.team?._id) loadSubmissions(data.team._id);
    } catch (err: any) {
      setModal({ isOpen: true, title: 'Upload Failed', message: err.message, type: 'error' });
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Change Password (Firebase Auth)
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await changeUserPassword(passData.old, passData.new);
      setModal({ isOpen: true, title: 'Success', message: 'Password updated successfully!', type: 'success' });
      setPassData({ old: '', new: '' });
    } catch (err: any) {
      setModal({ isOpen: true, title: 'Error', message: err.message || 'Failed to update password', type: 'error' });
    }
  };

  const inputCls = "w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition placeholder-gray-400 text-sm";

  if (!data) return <div className="min-h-screen pt-32 text-center text-gray-500 bg-gray-50 font-medium">Loading Analytics...</div>;

  const activeSubmission = submissions.find(s => s.active);

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 bg-gray-50">
      <Modal isOpen={modal.isOpen} onClose={() => setModal({ ...modal, isOpen: false })} title={modal.title} message={modal.message} type={modal.type} />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1e3a8a] rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
              {data.team.teamName.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{data.team.teamName}</h1>
              <p className="text-blue-600 text-sm font-medium">{data.team.institute}</p>
            </div>
          </div>

          <div className="flex gap-1 mt-6 md:mt-0 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
            {['overview', 'submissions', 'updates', 'profile'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`capitalize px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-[#1e3a8a] text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Payment Alert Banner */}
            {data.payment?.enabled && data.team.status !== 'Paid' && data.team.status !== 'Approved' && (
              <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-5">
                <div className="flex items-center gap-4 z-10">
                  <div className="bg-[#1e3a8a] p-3 rounded-xl text-white shadow-md">
                    <QrCode size={28} />
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-bold text-lg">Complete Registration</h3>
                    <p className="text-gray-600 text-sm mt-0.5">
                      Registration Fee: <span className="text-gray-900 font-bold text-lg">₹{data.payment.amount}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Payment gateway coming soon</p>
                  </div>
                </div>
                <button
                  disabled
                  className="z-10 px-6 py-2.5 bg-gray-100 text-gray-400 font-bold rounded-xl cursor-not-allowed text-sm border border-gray-200"
                >
                  Coming Soon
                </button>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-5">
              {/* Rank Card */}
              <div className="bg-white p-7 rounded-2xl relative overflow-hidden col-span-2 border border-gray-200 shadow-sm">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Trophy size={120} className="text-gray-900" /></div>
                <h3 className="text-gray-400 uppercase text-[10px] font-bold tracking-widest mb-1">Current Standing</h3>
                <div className="text-6xl font-black text-gray-900 tracking-tight">#{data.rank}</div>
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 text-xs">Cumulative Error:</span>
                  <span className="text-xl text-orange-500 font-mono font-bold">{data.team.cumulativeError ?? data.team.score ?? 0}</span>
                </div>
              </div>

              {/* Active Model Status */}
              <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
                <h3 className="text-gray-400 uppercase text-[10px] font-bold tracking-widest mb-1">Active Model</h3>
                {activeSubmission ? (
                  <>
                    <div className="flex items-center gap-2 mt-2">
                      {activeSubmission.buildStatus === 'ready' ? (
                        <CheckCircle className="text-green-500" size={22} />
                      ) : activeSubmission.buildStatus === 'building' ? (
                        <Loader2 className="text-blue-500 animate-spin" size={22} />
                      ) : (
                        <XCircle className="text-red-500" size={22} />
                      )}
                      <span className={`text-xl font-bold ${activeSubmission.buildStatus === 'ready' ? 'text-green-600' : activeSubmission.buildStatus === 'building' ? 'text-blue-600' : 'text-red-500'}`}>
                        {activeSubmission.buildStatus === 'ready' ? 'Ready' : activeSubmission.buildStatus === 'building' ? 'Building...' : 'Failed'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {activeSubmission.submittedAt ? new Date(activeSubmission.submittedAt).toLocaleString() : 'Recently submitted'}
                    </p>
                  </>
                ) : (
                  <div className="mt-2">
                    <p className="text-lg text-gray-400 font-bold">No model</p>
                    <p className="text-xs text-gray-400 mt-1">Upload your first model in the Submissions tab</p>
                  </div>
                )}
              </div>
            </div>

            {/* Prediction Stats Cards */}
            {teamPredictions.length > 0 && (() => {
              const successPreds = teamPredictions.filter(p => p.status === 'success' && p.totalError !== null);
              const avgError = successPreds.length > 0
                ? (successPreds.reduce((s: number, p: any) => s + (p.totalError || 0), 0) / successPreds.length).toFixed(1)
                : '—';
              const bestPred = successPreds.length > 0
                ? Math.min(...successPreds.map((p: any) => p.totalError))
                : null;
              const worstPred = successPreds.length > 0
                ? Math.max(...successPreds.map((p: any) => p.totalError))
                : null;
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                    <div className="text-3xl font-black text-blue-600">{teamPredictions.length}</div>
                    <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Matches Evaluated</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                    <div className="text-3xl font-black text-orange-500">{avgError}</div>
                    <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Avg Error</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                    <div className="text-3xl font-black text-green-600">{bestPred !== null ? bestPred : '—'}</div>
                    <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Best (Lowest)</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm text-center">
                    <div className="text-3xl font-black text-red-500">{worstPred !== null ? worstPred : '—'}</div>
                    <div className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Worst (Highest)</div>
                  </div>
                </div>
              );
            })()}

            {/* Prediction History Table */}
            {teamPredictions.length > 0 && (
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="p-5 border-b border-gray-100">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={18} /> Prediction History
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold border-b border-gray-100">
                      <tr>
                        <th className="p-3 text-left">#</th>
                        <th className="p-3 text-left">Match</th>
                        <th className="p-3 text-center">Pred I1</th>
                        <th className="p-3 text-center">Actual I1</th>
                        <th className="p-3 text-center">Pred I2</th>
                        <th className="p-3 text-center">Actual I2</th>
                        <th className="p-3 text-center">Error</th>
                        <th className="p-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {teamPredictions.map((pred: any, i: number) => (
                        <tr key={pred.id} className="hover:bg-blue-50/40 transition">
                          <td className="p-3 text-gray-400 font-mono text-xs">{pred.matchNumber || i + 1}</td>
                          <td className="p-3">
                            <span className="text-gray-900 font-bold text-xs">{pred.team1}</span>
                            <span className="text-gray-300 mx-1 text-xs">vs</span>
                            <span className="text-gray-900 font-bold text-xs">{pred.team2}</span>
                          </td>
                          <td className="p-3 text-center font-mono text-blue-600 text-xs">{pred.predictedScoreInning1 ?? '—'}</td>
                          <td className="p-3 text-center font-mono text-green-600 text-xs">{pred.actualScoreInning1 ?? '—'}</td>
                          <td className="p-3 text-center font-mono text-blue-600 text-xs">{pred.predictedScoreInning2 ?? '—'}</td>
                          <td className="p-3 text-center font-mono text-green-600 text-xs">{pred.actualScoreInning2 ?? '—'}</td>
                          <td className="p-3 text-center">
                            <span className={`font-mono font-bold text-xs ${pred.totalError === null ? 'text-gray-300' :
                              pred.totalError <= 10 ? 'text-green-600' :
                                pred.totalError <= 30 ? 'text-yellow-600' : 'text-red-500'
                              }`}>
                              {pred.totalError ?? '—'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pred.status === 'success'
                              ? 'bg-green-50 text-green-600 border-green-200'
                              : 'bg-red-50 text-red-500 border-red-200'
                              }`}>
                              {pred.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Error Trend Bar Chart */}
            {teamPredictions.filter(p => p.status === 'success' && p.totalError !== null).length > 1 && (() => {
              const chartData = teamPredictions.filter(p => p.status === 'success' && p.totalError !== null);
              const maxError = Math.max(...chartData.map((p: any) => p.totalError), 1);
              return (
                <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                  <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                    📈 Error Trend
                  </h3>
                  <div className="flex items-end gap-2 h-32">
                    {chartData.map((pred: any, i: number) => {
                      const height = Math.max(8, (pred.totalError / maxError) * 100);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-mono text-gray-400">{pred.totalError}</span>
                          <div
                            className={`w-full rounded-t transition-all ${pred.totalError <= 10 ? 'bg-green-500' :
                              pred.totalError <= 30 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                            style={{ height: `${height}%`, minHeight: '4px' }}
                          />
                          <span className="text-[9px] text-gray-400">M{pred.matchNumber || i + 1}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="grid md:grid-cols-3 gap-5">
              {/* Squad Management Button */}
              <div className="bg-white p-7 rounded-2xl flex flex-col justify-center items-center text-center border border-gray-200 shadow-sm">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-3">
                  <Users size={24} />
                </div>
                <h3 className="text-gray-900 font-bold text-base mb-1">Squad Management</h3>
                <p className="text-gray-400 text-xs mb-4">Edits Remaining: {data.team.maxEdits - data.team.editCount}</p>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="bg-[#1e3a8a] hover:bg-blue-800 text-white px-5 py-2 rounded-full text-sm font-bold transition shadow-md flex items-center gap-2"
                >
                  <Edit3 size={14} /> Manage Members
                </button>
              </div>

              {/* Yesterday's Dream Team */}
              <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm col-span-2">
                <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                  <Star className="text-yellow-500 fill-yellow-500" size={18} /> Yesterday's Dream Team
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {data.dreamTeam && data.dreamTeam.map((player: string, i: number) => (
                    <div key={i} className="min-w-[120px] bg-gray-50 p-3 rounded-xl text-center border border-gray-100">
                      <div className="w-9 h-9 bg-gray-200 rounded-full mx-auto mb-2"></div>
                      <div className="text-gray-900 font-bold text-xs truncate">{player}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Player</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SUBMISSIONS */}
        {activeTab === 'submissions' && (
          <div className="space-y-6">

            {/* Upload Section */}
            <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Upload className="text-blue-600" size={20} /> Upload Model
              </h2>
              <p className="text-gray-500 text-sm mb-5">
                Upload a <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-700 text-xs">.zip</code> file containing your <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-700 text-xs">mymodelfile.py</code>. Max 5MB.
              </p>

              {/* Model Contract Info */}
              <div className="bg-gray-50 rounded-xl p-5 mb-5 border border-gray-100">
                <h4 className="text-sm font-bold text-gray-700 mb-3">📋 Model Contract</h4>
                <div className="grid md:grid-cols-2 gap-4 text-xs text-gray-500">
                  <div>
                    <span className="text-gray-400 uppercase font-bold block mb-1">Your File</span>
                    <code className="text-green-700 bg-green-50 px-2 py-1 rounded block text-xs">mymodelfile.py</code>
                    <p className="mt-1">Must define a <code>MyModel</code> class with <code>__init__()</code>, <code>fit(deliveries_df)</code>, and <code>predict(test_df)</code> methods</p>
                  </div>
                  <div>
                    <span className="text-gray-400 uppercase font-bold block mb-1">Input → Output</span>
                    <code className="text-blue-700 bg-blue-50 px-2 py-1 rounded block text-xs">
                      test_file.csv → submission.csv
                    </code>
                    <p className="mt-1">Predict total innings runs. Output: <code>id, predicted_run</code>. Limits: 512MB, 1 CPU, 20s</p>
                  </div>
                </div>
              </div>

              {/* Upload Button */}
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleUpload}
                  className="hidden"
                  id="model-upload"
                />
                <label
                  htmlFor="model-upload"
                  className={`px-7 py-3.5 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-2 text-sm ${uploading
                    ? 'bg-gray-100 text-gray-400 cursor-wait'
                    : 'bg-[#1e3a8a] hover:bg-blue-800 text-white shadow-md hover:shadow-lg'
                    }`}
                >
                  {uploading ? (
                    <><Loader2 className="animate-spin" size={16} /> {uploadProgress}</>
                  ) : (
                    <><FileArchive size={16} /> Select .zip File</>
                  )}
                </label>
                {pollingId && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle size={14} />
                    Model ready for evaluation
                  </div>
                )}
              </div>
            </div>

            {/* Submission History */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Clock size={16} className="text-gray-400" /> Submission History
                </h3>
              </div>
              {submissions.length > 0 ? (
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                    <tr>
                      <th className="p-3 pl-5">Status</th>
                      <th className="p-3">Image Tag</th>
                      <th className="p-3">Active</th>
                      <th className="p-3 text-right pr-5">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {submissions.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-blue-50/40 transition">
                        <td className="p-3 pl-5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${sub.buildStatus === 'ready'
                            ? 'bg-green-50 border-green-200 text-green-600'
                            : sub.buildStatus === 'building'
                              ? 'bg-blue-50 border-blue-200 text-blue-600'
                              : 'bg-red-50 border-red-200 text-red-500'
                            }`}>
                            {sub.buildStatus === 'ready' ? <CheckCircle size={10} /> :
                              sub.buildStatus === 'building' ? <Loader2 size={10} className="animate-spin" /> :
                                <XCircle size={10} />}
                            {sub.buildStatus}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs text-gray-400">{sub.fileSize ? `${(sub.fileSize / 1024).toFixed(1)} KB` : '—'}</td>
                        <td className="p-3">
                          {sub.active ? <span className="text-green-600 font-bold text-xs">● Active</span> : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="p-3 text-right pr-5 text-gray-400 text-xs">
                          {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-12 text-center text-gray-400 text-sm">No submissions yet. Upload your first model above!</div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: UPDATES (Announcements) */}
        {activeTab === 'updates' && (
          <div className="max-w-3xl mx-auto space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2"><Bell className="text-yellow-500" size={20} /> Latest Announcements</h2>
            {data.announcements && data.announcements.length > 0 ? data.announcements.map((msg: any, i: number) => (
              <div key={i} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex gap-3">
                <div className="bg-blue-50 p-2.5 rounded-full text-blue-500 h-fit"><Megaphone size={18} /></div>
                <div>
                  <p className="text-gray-900 text-sm leading-relaxed">{msg.message}</p>
                  <p className="text-xs text-gray-400 mt-1.5">{msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleString() : new Date(msg.timestamp?.seconds ? msg.timestamp.seconds * 1000 : msg.timestamp).toLocaleString()}</p>
                </div>
              </div>
            )) : <div className="text-center text-gray-400 py-12 bg-white rounded-2xl border border-gray-100 text-sm">No announcements yet.</div>}
          </div>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'profile' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Team Details */}
            <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                <UserCircle className="text-blue-600" size={18} /> Team Profile
              </h3>
              <div className="space-y-3">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-0.5">Captain Name</span>
                  <span className="text-gray-900 font-bold">{data.team.captainName}</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-0.5">Registered Email</span>
                  <span className="text-gray-900 font-bold">{data.team.captainEmail}</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block mb-0.5">Institute</span>
                  <span className="text-gray-900 font-bold">{data.team.institute}</span>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white p-7 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Key className="text-yellow-500" size={18} /> Security Settings
              </h3>
              <form onSubmit={changePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">Current Password</label>
                  <input
                    type="password" required
                    className={inputCls}
                    value={passData.old} onChange={e => setPassData({ ...passData, old: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1.5">New Password</label>
                  <input
                    type="password" required
                    className={inputCls}
                    value={passData.new} onChange={e => setPassData({ ...passData, new: e.target.value })}
                  />
                </div>
                <button className="w-full bg-[#1e3a8a] hover:bg-blue-800 text-white py-3 rounded-xl text-sm font-bold shadow-md transition">
                  Update Password
                </button>
              </form>
            </div>
          </div>
        )}

        {/* EDIT SQUAD MODAL */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100] backdrop-blur-sm p-4">
            <div className="bg-white border border-gray-200 p-7 rounded-2xl w-full max-w-lg relative shadow-2xl">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Update Squad</h2>
              <p className="text-red-500 text-xs mb-5 font-bold uppercase tracking-wide">
                Edits Remaining: {data.team.maxEdits - data.team.editCount}
              </p>

              <div className="space-y-3 mb-6">
                {tempMembers.map((m, i) => (
                  <div key={i} className="relative">
                    <span className="absolute left-4 top-3 text-gray-400 text-xs font-bold">#{i + 1}</span>
                    <input
                      type="text"
                      value={m}
                      onChange={(e) => {
                        const copy = [...tempMembers];
                        copy[i] = e.target.value;
                        setTempMembers(copy);
                      }}
                      placeholder={`Member ${i + 1} Name`}
                      className={`${inputCls} pl-10 ${i === 0 ? 'border-blue-300 bg-blue-50/50' : ''}`}
                      disabled={i === 0}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 text-gray-500 hover:text-gray-900 font-bold bg-gray-50 rounded-xl text-sm border border-gray-200">Cancel</button>
                <button onClick={saveMembers} className="flex-1 py-2.5 bg-[#1e3a8a] hover:bg-blue-800 text-white rounded-xl text-sm font-bold shadow-md">Save Changes</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default UserDashboard;