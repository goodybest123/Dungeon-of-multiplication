
import React from 'react';

interface TutorBubbleProps {
  message: string;
  isThinking: boolean;
}

const TutorBubble: React.FC<TutorBubbleProps> = ({ message, isThinking }) => {
  return (
    <div className="flex items-end gap-3 w-full animate-fade-in-up">
      <div className="flex-shrink-0 relative -bottom-2">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-slate-800 flex items-center justify-center shadow-xl border-4 border-amber-500 overflow-hidden">
             {/* Wizard SVG */}
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" className="w-12 h-12 md:w-16 md:h-16 text-indigo-400">
                <path fill="currentColor" d="M228.6 15.6c-9.1-8-23.7-3.9-27.1 7.7L167.3 140l-28.6 96.9c-28.4 4.5-50.1 29.1-50.1 59.1c0 33.1 26.9 60 60 60s60-26.9 60-60c0-10.4-2.6-20.1-7.2-28.6l31.1-105.4 68.6 68.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-117.8-170zM352 352a96 96 0 1 0 -192 0 96 96 0 1 0 192 0zM492.6 30.6l-20.7 20.7c-9.6-1.5-19.4 1.1-26.2 7.9c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0c6.8-6.8 9.4-16.6 7.9-26.2l20.7-20.7c6.2-6.2 6.2-16.4 0-22.6s-16.4-6.2-22.6 0zm-153.1 39c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0z"/>
            </svg>
        </div>
        {isThinking && (
            <div className="absolute top-0 right-0 text-2xl animate-bounce">✨</div>
        )}
      </div>
      <div className="bg-amber-100 text-stone-900 p-3 md:p-4 rounded-2xl rounded-bl-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] border-2 border-amber-600 flex-grow relative max-w-2xl">
        <p className="text-base md:text-lg font-medium leading-tight font-medieval">
            {isThinking ? "Consulting the ancient scrolls..." : message}
        </p>
      </div>
    </div>
  );
};

export default TutorBubble;
