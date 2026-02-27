import React, { useState } from 'react';

const faqItems = [
    {
        question: 'How does my model get scored?',
        answer: 'Your model receives match data (teams, stadium, toss) and must predict runs scored for both innings. The absolute error |predicted - actual| is summed across all matches. Lower cumulative error = higher rank.'
    },
    {
        question: 'What should my .zip file contain?',
        answer: 'A Dockerfile and your prediction script. The container must read /data/input.json and print JSON with predictedRunsInning1 and predictedRunsInning2 to stdout. See the Rules page for a working example.'
    },
    {
        question: 'Can we change team members?',
        answer: 'Yes, the captain can edit team members up to 2 times from the dashboard after registration.'
    },
    {
        question: 'What happens if my container fails or times out?',
        answer: 'A container failure or timeout results in a 999-point penalty per innings for that match. Make sure your code handles edge cases gracefully.'
    },
    {
        question: 'What programming languages can I use?',
        answer: 'Any language that can run inside a Docker container. Python is recommended since the sample model uses it, but you can use R, Julia, Node.js, or anything else — as long as it reads /data/input.json and prints JSON to stdout.'
    },
    {
        question: 'How many submissions can I make?',
        answer: 'You can submit updated Docker containers as many times as you like before each match is evaluated. Only your latest submission is used for scoring.'
    },
    {
        question: 'What data is available for training?',
        answer: 'Historical IPL and international cricket match data. Check the Rules page for the training data download link.'
    },
    {
        question: 'How many members per team?',
        answer: 'Each team can have up to 6 members. One member is designated as the captain who manages the team dashboard and submissions.'
    }
];

const FAQ: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="bg-white">
            {/* Header */}
            <section className="bg-gradient-to-br from-cream to-sky py-14">
                <div className="max-w-container mx-auto px-4 lg:px-8 text-center">
                    <h1 className="font-heading font-bold text-3xl lg:text-4xl text-slate mb-3">Frequently Asked Questions</h1>
                    <p className="text-gray-500 max-w-xl mx-auto">
                        Common questions about the competition, submissions, and scoring.
                    </p>
                </div>
            </section>

            <div className="max-w-3xl mx-auto px-4 lg:px-8 py-14">
                <div className="space-y-3">
                    {faqItems.map((item, idx) => {
                        const isOpen = openIndex === idx;
                        return (
                            <div
                                key={idx}
                                className={`card-static overflow-hidden transition-all duration-micro ease-micro ${isOpen ? 'ring-1 ring-royal/20' : ''}`}
                            >
                                <button
                                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50/50 transition-colors duration-micro"
                                >
                                    <span className={`font-heading font-medium text-sm ${isOpen ? 'text-royal' : 'text-slate'}`}>
                                        {item.question}
                                    </span>
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ml-3 transition-all duration-micro ${isOpen ? 'bg-royal text-white rotate-45' : 'bg-gray-100 text-gray-400'
                                        }`}>
                                        +
                                    </span>
                                </button>
                                {isOpen && (
                                    <div className="px-5 pb-4">
                                        <p className="text-sm text-gray-600 leading-relaxed">{item.answer}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default FAQ;
