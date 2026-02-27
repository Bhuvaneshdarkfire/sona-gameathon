import React from 'react';

const About: React.FC = () => {
    return (
        <div className="bg-white">
            {/* Header */}
            <section className="bg-gradient-to-br from-cream to-sky py-14">
                <div className="max-w-container mx-auto px-4 lg:px-8 text-center">
                    <h1 className="font-heading font-bold text-3xl lg:text-4xl text-slate mb-3">About the Event</h1>
                    <p className="text-gray-500 max-w-xl mx-auto">
                        Learn how the IPL PowerPlay Prediction Hackathon works — from registration to competition.
                    </p>
                </div>
            </section>

            <div className="max-w-container mx-auto px-4 lg:px-8 py-14">
                {/* How It Works */}
                <div className="mb-12">
                    <h2 className="section-heading text-2xl mb-6">How It Works</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {[
                            { num: '1', title: 'Register', desc: 'Sign up your team of up to 6 members via the registration form.' },
                            { num: '2', title: 'Build Model', desc: 'Train your ML algorithm on historical cricket data to predict match outcomes.' },
                            { num: '3', title: 'Submit', desc: 'Package your prediction script in a Docker container and upload the .zip file.' },
                            { num: '4', title: 'Compete', desc: 'Your model predicts runs for live matches. Lowest cumulative error wins.' },
                        ].map((s) => (
                            <div key={s.num} className="card p-6">
                                <div className="w-9 h-9 rounded-full bg-royal text-white flex items-center justify-center font-heading font-bold text-sm mb-3">
                                    {s.num}
                                </div>
                                <h3 className="font-heading font-semibold text-slate mb-1">{s.title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* About Organizers */}
                <div className="mb-12">
                    <h2 className="section-heading text-2xl mb-4">About The Organizers</h2>
                    <h3 className="font-heading font-semibold text-lg text-slate mb-3">Department of Computer Science Engineering</h3>
                    <p className="text-gray-600 mb-5 max-w-3xl leading-relaxed">
                        The Sona Gameathon is the flagship event of the CSD Department at Sona College of Technology.
                        Our mission is to bridge the gap between academic theory and real-world sports analytics.
                    </p>

                    <div className="grid sm:grid-cols-3 gap-5 mb-8">
                        {[
                            { icon: '📊', title: 'Industry Standard Data', desc: 'Access to real IPL and International cricket datasets.' },
                            { icon: '🐳', title: 'Docker-Based Evaluation', desc: 'Your model runs in a sandboxed Docker container with automated scoring.' },
                            { icon: '📈', title: 'Real-Time Leaderboard', desc: 'Live scoring and rankings after each match evaluation.' },
                        ].map((f) => (
                            <div key={f.title} className="card p-5">
                                <span className="text-2xl mb-3 block">{f.icon}</span>
                                <h4 className="font-heading font-semibold text-slate text-sm mb-1">{f.title}</h4>
                                <p className="text-gray-500 text-sm">{f.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* Vision Quote */}
                    <div className="card-static bg-sky/30 p-6">
                        <p className="font-heading font-bold text-slate mb-1">Vision 2026</p>
                        <p className="text-gray-600 italic leading-relaxed">
                            "To create a platform where code dictates the play, and algorithms predict the champions."
                        </p>
                        <p className="text-gray-400 text-sm mt-2">— Head of Department, CSD</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default About;
