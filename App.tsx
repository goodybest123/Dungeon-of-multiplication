import React, { useState, useCallback, useMemo } from 'react';
import { AppState, MathFact } from './types';
import NumberVisualizer from './components/NumberVisualizer';
import Keypad from './components/Keypad';
import TutorBubble from './components/TutorBubble';
import StudyScroll from './components/StudyScroll';
import { generateTutorResponse, generateWordProblem } from './services/geminiService';

// --- Background Effects Component ---
const BackgroundEffects = React.memo(() => {
  // Generate random floating math facts for atmosphere
  const floatingFacts = useMemo(() => {
    return Array.from({ length: 8 }).map((_, i) => {
      const a = Math.floor(Math.random() * 9) + 2;
      const b = Math.floor(Math.random() * 9) + 2;
      const isBlue = Math.random() > 0.5;
      return {
        id: i,
        text: `${a}×${b}=`,
        x: Math.random() * 90 + 5, // 5% to 95% width
        y: Math.random() * 80 + 10, // 10% to 90% height
        size: Math.random() * 2 + 1.5, // 1.5rem to 3.5rem
        colorClass: isBlue ? 'text-cyan-200 neon-blue' : 'text-purple-200 neon-purple',
        animClass: i % 3 === 0 ? 'animate-float' : i % 3 === 1 ? 'animate-float-delayed' : 'animate-float-slow',
        rotation: Math.random() * 10 - 5
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Stone Archway / Door effect (CSS handles texture, this adds the glow center) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[70vh] rounded-t-full bg-gradient-to-b from-cyan-900/20 to-transparent blur-3xl opacity-50"></div>

        {/* Torches */}
        <div className="absolute top-1/3 left-[5%] w-4 h-20 bg-orange-500/20 blur-xl torch-flicker"></div>
        <div className="absolute top-1/3 right-[5%] w-4 h-20 bg-orange-500/20 blur-xl torch-flicker"></div>
        
        {/* Floating Numbers */}
        {floatingFacts.map((fact) => (
            <div 
                key={fact.id}
                className={`absolute font-medieval font-bold opacity-60 ${fact.colorClass} ${fact.animClass}`}
                style={{
                    left: `${fact.x}%`,
                    top: `${fact.y}%`,
                    fontSize: `${fact.size}rem`,
                    transform: `rotate(${fact.rotation}deg)`
                }}
            >
                {fact.text}
            </div>
        ))}
        
        {/* Cobwebs / Dust */}
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-stone-900/10 blur-sm rounded-tr-full"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-stone-900/10 blur-sm rounded-tl-full"></div>
    </div>
  );
});

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.MENU);
  const [dungeonLevel, setDungeonLevel] = useState<number | null>(null); // Specific table (1-12) or null for mixed
  const [currentStep, setCurrentStep] = useState<number>(1); // Progress 1-12 in sequential mode
  
  // Game State
  const [currentQuestion, setCurrentQuestion] = useState<{ a: number, b: number }>({ a: 1, b: 1 });
  const [inputValue, setInputValue] = useState<string>("");
  const [gold, setGold] = useState(0);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<MathFact[]>([]);
  const [showVisual, setShowVisual] = useState(false);
  const [dungeonEvent, setDungeonEvent] = useState<string | null>(null);
  
  // AI State
  const [tutorMessage, setTutorMessage] = useState("Welcome, Adventurer! Which dungeon shall we explore?");
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  // Feedback UI State
  const [feedbackStatus, setFeedbackStatus] = useState<'neutral' | 'correct' | 'wrong'>('neutral');

  // --- Logic Helpers ---

  const prepareLevel = (level: number | null) => {
    setDungeonLevel(level);
    if (level === null) {
      // Chaos mode skips study
      enterDungeon(null);
    } else {
      // Specific level goes to study mode first
      setAppState(AppState.STUDY);
    }
  };

  const enterDungeon = (level: number | null) => {
    setAppState(AppState.GAME);
    setGold(0);
    setStreak(0);
    setHistory([]);
    setCurrentStep(1); // Reset step for sequential
    setTutorMessage(level 
      ? `The gates of the ${level}s Dungeon open! Defeat all 12 rooms!` 
      : "Entering the Chaos Dungeon! Stay sharp!");
    generateQuestion(level, 1);
  };

  const generateQuestion = useCallback((level: number | null, step: number) => {
    let a, b;
    
    if (level !== null) {
      // Sequential Learning Mode
      a = level;
      b = step; // 1 to 12
    } else {
      // Chaos Mode (Random)
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
    }

    setCurrentQuestion({ a, b });
    setInputValue("");
    setShowVisual(false);
    setDungeonEvent(null);
    setFeedbackStatus('neutral');

    // Pre-load a word problem flavor text occasionally
    if (Math.random() > 0.6) {
        generateDungeonFlavor(a, b);
    }
  }, []);

  const generateDungeonFlavor = async (a: number, b: number) => {
      // Don't block UI, just fetch
      const flavor = await generateWordProblem(a, b);
      setDungeonEvent(flavor);
  };

  const handleKeypadPress = (val: number | string) => {
    if (inputValue.length < 3) {
      setInputValue(prev => prev + val);
    }
  };

  const handleDelete = () => {
    setInputValue(prev => prev.slice(0, -1));
  };

  const handleAiFeedback = async (correct: boolean, a: number, b: number) => {
    setIsAiThinking(true);
    
    // Construct context
    const recentHistory = history.slice(-5).map(h => `${h.factorA}x${h.factorB}=${h.isCorrect ? 'Hit' : 'Miss'}`).join(', ');
    const context = correct 
        ? `Hero correctly solved ${a} groups of ${b}.` 
        : `Hero failed to solve ${a} groups of ${b}. Input: ${inputValue}.`;
    
    const performance = `Combo: ${streak}. Recent battles: ${recentHistory}`;

    const msg = await generateTutorResponse(context, correct ? "Critical Hit" : "Missed Attack", performance);
    setTutorMessage(msg);
    setIsAiThinking(false);
  };

  const handleSubmit = async () => {
    if (inputValue === "") return;

    const userAns = parseInt(inputValue);
    const correctAns = currentQuestion.a * currentQuestion.b;
    const isCorrect = userAns === correctAns;

    const newFact: MathFact = {
      factorA: currentQuestion.a,
      factorB: currentQuestion.b,
      userAnswer: userAns,
      isCorrect,
      timestamp: Date.now()
    };

    setHistory(prev => [...prev, newFact]);

    if (isCorrect) {
      const baseGold = 10;
      const comboBonus = streak * 5;
      setGold(prev => prev + baseGold + comboBonus); 
      
      const newStreak = streak + 1;
      setStreak(newStreak);
      setFeedbackStatus('correct');
      
      // Random AI praise
      if (newStreak % 4 === 0 || Math.random() > 0.7) {
        handleAiFeedback(true, currentQuestion.a, currentQuestion.b);
      } else {
        const praises = ["Epic!", "Gold acquired!", "Victory!", "The chest opens!", "Splendid!"];
        setTutorMessage(praises[Math.floor(Math.random() * praises.length)]);
      }

      // Next Question Logic
      setTimeout(() => {
        if (dungeonLevel !== null) {
          // Check if dungeon complete
          if (currentStep >= 12) {
             // Dungeon Complete
             setTutorMessage("DUNGEON CLEARED! You are a Master!");
             // For now, loop back to menu after a delay, or restart chaos
             setTimeout(() => setAppState(AppState.MENU), 3000);
          } else {
             // Next sequential room
             const nextStep = currentStep + 1;
             setCurrentStep(nextStep);
             generateQuestion(dungeonLevel, nextStep);
          }
        } else {
          // Chaos mode infinite
          generateQuestion(null, 1);
        }
      }, 1200);

    } else {
      setStreak(0);
      setFeedbackStatus('wrong');
      setShowVisual(true); // Reveal the answer visually
      handleAiFeedback(false, currentQuestion.a, currentQuestion.b);
    }
  };

  // --- Render Sections ---

  const renderMenu = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 max-w-4xl mx-auto z-10 relative">
      <div className="text-center mb-10 bg-indigo-950/80 p-6 rounded-3xl border-4 border-indigo-400 shadow-2xl backdrop-blur-sm">
        <h1 className="text-5xl md:text-7xl font-bold text-amber-500 mb-2 drop-shadow-[0_4px_4px_rgba(0,0,0,1)] tracking-wider">
          Dungeon of Multiplication
        </h1>
        <p className="text-xl text-indigo-100 font-medieval">Master the tables to defeat the dungeon!</p>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-4 gap-4 w-full mb-8">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
          <button
            key={num}
            onClick={() => prepareLevel(num)}
            className="aspect-square bg-indigo-900/90 hover:bg-indigo-800/90 border-4 border-indigo-500 hover:border-amber-400 rounded-xl text-3xl font-bold transition-all transform hover:scale-105 shadow-lg flex flex-col items-center justify-center group backdrop-blur-sm"
          >
            <span className="text-indigo-300 text-xs uppercase mb-1 group-hover:text-amber-400">Dungeon</span>
            <span className="text-white group-hover:text-amber-400">{num}</span>
          </button>
        ))}
      </div>

      <button
        onClick={() => prepareLevel(null)}
        className="w-full max-w-md bg-gradient-to-r from-purple-900/90 to-indigo-900/90 hover:from-purple-800 hover:to-indigo-800 border-2 border-purple-500 text-purple-100 text-2xl font-bold py-6 rounded-xl shadow-xl transition-all transform hover:-translate-y-1 font-medieval backdrop-blur-sm"
      >
        Enter the Chaos Dungeon (Random)
      </button>
    </div>
  );

  const renderGame = () => (
    <div className="flex flex-col h-screen max-w-6xl mx-auto p-4 relative z-10">
      {/* Top Bar: Stats & Escape */}
      <div className="flex justify-between items-center mb-4 bg-indigo-950/80 p-4 rounded-xl border-2 border-indigo-600 shadow-lg shrink-0 backdrop-blur-md">
        <button 
          onClick={() => setAppState(AppState.MENU)}
          className="text-indigo-300 hover:text-white font-bold font-medieval flex items-center gap-2"
        >
          <span>⚔</span> Escape
        </button>
        
        {/* Dungeon Progress Indicator */}
        {dungeonLevel && (
           <div className="flex flex-col items-center px-4">
              <span className="text-xs text-indigo-400 uppercase tracking-widest">Room</span>
              <span className="text-xl font-medieval text-white">{currentStep} / 12</span>
           </div>
        )}

        <div className="flex gap-6">
           <div className="flex flex-col items-end">
             <span className="text-xs text-amber-500 uppercase font-bold tracking-widest">Gold</span>
             <span className="text-xl font-bold text-yellow-400 flex items-center gap-1">
                {gold} 🪙
             </span>
           </div>
           <div className="flex flex-col items-end hidden sm:flex">
             <span className="text-xs text-emerald-500 uppercase font-bold tracking-widest">Combo</span>
             <span className="text-xl font-bold text-emerald-400">x{streak} 🔥</span>
           </div>
        </div>
      </div>

      {/* Landscape Grid Layout */}
      <div className="flex flex-col md:flex-row gap-6 flex-grow min-h-0">
        
        {/* Left Panel: The Encounter (Tutor + Question + Visual) */}
        <div className="flex-grow flex flex-col bg-stone-900/60 rounded-2xl p-6 shadow-2xl border-4 border-stone-700/50 backdrop-blur-sm relative overflow-y-auto">
             
             {/* Tutor */}
             <div className="mb-4 shrink-0">
                <TutorBubble message={tutorMessage} isThinking={isAiThinking} />
             </div>

             {/* The Encounter Card */}
             <div className={`flex flex-col items-center justify-center p-6 rounded-xl border-4 transition-colors duration-500 flex-grow relative bg-stone-950/40 ${
                feedbackStatus === 'correct' ? 'border-emerald-500/70 bg-emerald-900/10' : 
                feedbackStatus === 'wrong' ? 'border-red-500/70 bg-red-900/10' : 'border-indigo-500/30'
              }`}>
                
                {/* Flavor Text */}
                {dungeonEvent && !showVisual && (
                     <div className="w-full bg-indigo-950/90 p-3 rounded-lg border border-indigo-700 mb-6 text-center animate-fade-in absolute top-4 left-4 right-4 max-w-[90%] mx-auto z-10">
                        <p className="text-indigo-200 italic font-medieval text-lg">"{dungeonEvent}"</p>
                     </div>
                )}

                {/* The Equation */}
                <div className="flex items-center gap-2 sm:gap-4 text-5xl md:text-7xl lg:text-8xl font-bold font-medieval text-indigo-100 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] z-0 my-auto">
                    <div className="flex flex-col items-center">
                        <span className="text-amber-500 drop-shadow-md">{currentQuestion.a}</span>
                        <span className="text-xs text-indigo-300 font-sans mt-1 uppercase tracking-widest text-[0.3em] opacity-80">Groups</span>
                    </div>
                    <span className="text-indigo-400 text-4xl neon-blue">×</span>
                    <div className="flex flex-col items-center">
                        <span className="text-cyan-400 drop-shadow-md neon-blue">{currentQuestion.b}</span>
                        <span className="text-xs text-indigo-300 font-sans mt-1 uppercase tracking-widest text-[0.3em] opacity-80">Items</span>
                    </div>
                    <span className="text-indigo-400 text-4xl neon-blue">=</span>
                    <div className={`min-w-[1.2em] text-center border-b-4 ${
                        inputValue ? 'text-white border-white neon-purple' : 'text-indigo-700 border-indigo-700'
                    }`}>
                        {inputValue || "?"}
                    </div>
                </div>

                {/* Visualizer (Appears below equation) */}
                <div className="w-full flex justify-center mt-4 min-h-[50px]">
                    {!showVisual && feedbackStatus !== 'correct' ? (
                        <button
                            onClick={() => setShowVisual(true)}
                            className="text-sm font-bold text-indigo-300 hover:text-amber-400 underline decoration-dotted underline-offset-4"
                        >
                            Use "True Sight" Scroll (Show Visuals)
                        </button>
                    ) : (
                        <NumberVisualizer a={currentQuestion.a} b={currentQuestion.b} show={showVisual} />
                    )}
                </div>
             </div>
        </div>

        {/* Right Panel: Controls (Keypad) */}
        <div className="w-full md:w-80 lg:w-96 shrink-0 flex flex-col justify-end md:justify-center">
            <div className="bg-stone-900/80 p-4 rounded-2xl border-4 border-stone-600 shadow-xl backdrop-blur-md">
                 <h3 className="text-center text-indigo-200 font-medieval mb-4 text-lg">Cast Spell (Answer)</h3>
                 <Keypad 
                    onPress={handleKeypadPress}
                    onDelete={handleDelete}
                    onSubmit={handleSubmit}
                    disabled={feedbackStatus === 'correct'} 
                 />
            </div>
        </div>

      </div>
    </div>
  );

  return (
    <div className="min-h-screen dungeon-bg overflow-x-hidden text-stone-100 relative">
      <BackgroundEffects />
      
      {appState === AppState.MENU && renderMenu()}
      
      {appState === AppState.STUDY && dungeonLevel !== null && (
        <StudyScroll 
          number={dungeonLevel} 
          onStart={() => enterDungeon(dungeonLevel)} 
          onBack={() => setAppState(AppState.MENU)} 
        />
      )}
      
      {appState === AppState.GAME && renderGame()}
    </div>
  );
};

export default App;