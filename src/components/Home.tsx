// src/components/Home.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Target, 
  HelpCircle, 
  ChevronRight, 
  BarChart3, 
  Code2, 
  UserPlus 
} from 'lucide-react';

const Home: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/public/data')
      .then(res => res.json())
      .then(data => data.leaderboard && setLeaderboard(data.leaderboard))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen pt-20">
      
      {/* 1. HERO SECTION */}
      <section className="relative py-24 px-6 text-center overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -z-10"></div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-300 text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Registration Open for Season 2026
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Predict the Game. <br />
            <span className="text-gold-gradient">Master the Data.</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Join the premier sports analytics hackathon. Build AI models to draft the ultimate fantasy cricket team and compete against live match outcomes.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register" className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all hover:scale-105 flex items-center justify-center gap-2">
              Register Team <ChevronRight size={20} />
            </Link>
            <a href="#rules" className="px-8 py-4 glass-panel-light hover:bg-white/10 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2">
              View Rules
            </a>
          </div>
        </motion.div>
      </section>

      {/* 2. LIVE LEADERBOARD (ID for Scroll Link) */}
      <section id="leaderboard" className="max-w-6xl mx-auto px-6 mb-24">
        <div className="glass-panel rounded-2xl p-1 border border-white/10">
          <div className="bg-[#0b1121] rounded-[14px] overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <Trophy className="text-yellow-500" size={24} />
                <h2 className="text-xl font-bold text-white">Live Tournament Standings</h2>
              </div>
              <div className="text-xs font-mono text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> LIVE FEED
              </div>
            </div>
            
            <table className="w-full text-left">
              <thead className="bg-black/20 text-gray-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="p-4 pl-6">Rank</th>
                  <th className="p-4">Team Name</th>
                  <th className="p-4 hidden md:table-cell">Institute</th>
                  <th className="p-4 text-right pr-6">Fantasy Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {leaderboard.length > 0 ? leaderboard.map((team, idx) => (
                  <tr key={idx} className="hover:bg-blue-900/10 transition-colors">
                    <td className="p-4 pl-6 font-mono text-gray-400">#{idx + 1}</td>
                    <td className="p-4 font-bold text-white text-base">{team.teamName}</td>
                    <td className="p-4 hidden md:table-cell text-gray-400">{team.institute}</td>
                    <td className="p-4 text-right pr-6 font-mono font-bold text-yellow-500 text-base">{team.score}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="p-12 text-center text-gray-500">Wait for the first match result...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3. TIMELINE & PROCESS */}
      <section className="bg-white/5 py-20 px-6 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-16">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: UserPlus, step: "01", title: "Register", desc: "Sign up your team of 6 members." },
              { icon: Code2, step: "02", title: "Build Model", desc: "Train your AI on historical cricket data." },
              { icon: Target, step: "03", title: "Submit", desc: "Upload your Docker container for validation." },
              { icon: BarChart3, step: "04", title: "Compete", desc: "Your AI picks teams daily. Highest points win." }
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="text-6xl font-black text-white/5 absolute -top-8 -left-4 z-0">{item.step}</div>
                <div className="relative z-10 glass-panel p-6 rounded-xl hover:-translate-y-2 transition-transform duration-300">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white mb-4 shadow-lg shadow-blue-600/30">
                    <item.icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. FAQ & DETAILS */}
      <section id="rules" className="max-w-4xl mx-auto py-24 px-6 grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-3xl font-bold text-white mb-6">Evaluation Criteria</h2>
          <div className="space-y-4">
            <div className="glass-panel p-5 rounded-lg flex items-center justify-between">
              <span className="font-bold text-gray-300">Fantasy Score Accuracy</span>
              <span className="text-yellow-400 font-bold">70%</span>
            </div>
            <div className="glass-panel p-5 rounded-lg flex items-center justify-between">
              <span className="font-bold text-gray-300">Code Efficiency</span>
              <span className="text-blue-400 font-bold">20%</span>
            </div>
            <div className="glass-panel p-5 rounded-lg flex items-center justify-between">
              <span className="font-bold text-gray-300">Documentation</span>
              <span className="text-purple-400 font-bold">10%</span>
            </div>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div className="glass-panel p-5 rounded-lg">
              <h4 className="font-bold text-white mb-2 flex items-center gap-2"><HelpCircle size={16} className="text-blue-500"/> Can we change team members?</h4>
              <p className="text-sm text-gray-400">Yes, the captain can edit team members up to 2 times from the dashboard.</p>
            </div>
            <div className="glass-panel p-5 rounded-lg">
              <h4 className="font-bold text-white mb-2 flex items-center gap-2"><HelpCircle size={16} className="text-blue-500"/> Is there a registration fee?</h4>
              <p className="text-sm text-gray-400">If the payment mode is active, you will see instructions on the dashboard. Otherwise, it is free.</p>
            </div>
          </div>
        </div>
      </section>

        {/* 5. ABOUT US SECTION */}
        <section className="py-24 px-6 bg-[#0f172a]/50">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block px-4 py-1 mb-4 rounded-full bg-blue-900/30 text-blue-400 text-xs font-bold uppercase tracking-wider">About The Organizers</div>
              <h2 className="text-4xl font-bold text-white mb-6">Department of Computer Science & Design</h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                The Sona Gameathon is the flagship event of the CSD Department at Sona College of Technology. 
                Our mission is to bridge the gap between academic theory and real-world sports analytics.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mt-1">✓</div>
                  <div><h4 className="text-white font-bold">Industry Standard Data</h4><p className="text-sm text-gray-500">Access to real IPL and International cricket datasets.</p></div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mt-1">✓</div>
                  <div><h4 className="text-white font-bold">Expert Mentorship</h4><p className="text-sm text-gray-500">Guidance from data scientists and cricket analysts.</p></div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl blur-2xl opacity-20"></div>
              <div className="glass-panel p-8 rounded-2xl relative border border-white/10">
                <h3 className="text-2xl font-bold text-white mb-4">Vision 2026</h3>
                <p className="text-gray-400 italic">
                  "To create a platform where code dictates the play, and algorithms predict the champions."
                </p>
                <div className="mt-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-full"></div>
                  <div>
                    <div className="text-white font-bold">Dr. HOD Name</div>
                    <div className="text-xs text-blue-400 uppercase">Head of Department</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

              {/* Footer */}
              <footer className="border-t border-white/10 bg-[#020617] py-12 text-center">
                <p className="text-gray-500 text-sm">© 2026 Sona Gameathon. Organized by Department of CSD.</p>
              </footer>
            </div>
          );
        };

export default Home;