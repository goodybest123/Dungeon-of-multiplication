
import React, { useState, useEffect, useRef } from 'react';
import { getSingingVoice } from '../services/geminiService';

interface StudyScrollProps {
  number: number;
  onStart: () => void;
  onBack: () => void;
}

const StudyScroll: React.FC<StudyScrollProps> = ({ number, onStart, onBack }) => {
  const table = Array.from({ length: 12 }, (_, i) => i + 1);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  
  // Modes: 'IDLE', 'CHANTING' (Singing), 'RECITING' (Drill)
  const [mode, setMode] = useState<'IDLE' | 'CHANTING' | 'RECITING'>('IDLE');
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [isListening, setIsListening] = useState(false); // Mic active state
  
  const stopRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recognitionRef = useRef<any>(null);

  // --- Cleanup ---
  useEffect(() => {
    return () => {
      stopRef.current = true;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (audioContextRef.current) audioContextRef.current.close();
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // --- Helper: Decode & Play Gemini Audio ---
  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const playGeminiAudio = async (base64Data: string): Promise<void> => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    try {
        const pcmData = decodeBase64(base64Data);
        const int16Data = new Int16Array(pcmData.buffer);
        const float32Data = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) float32Data[i] = int16Data[i] / 32768.0;

        const buffer = ctx.createBuffer(1, float32Data.length, 24000);
        buffer.copyToChannel(float32Data, 0);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        
        return new Promise((resolve) => {
            source.onended = () => resolve();
            source.start();
            const checkStop = setInterval(() => {
                if (stopRef.current) {
                    source.stop();
                    clearInterval(checkStop);
                    resolve();
                }
            }, 100);
        });
    } catch (e) {
        console.error("Audio decode error", e);
        return Promise.resolve();
    }
  };

  // --- Helper: Browser TTS ---
  const speakText = (text: string, rate = 0.9): Promise<void> => {
    return new Promise((resolve) => {
      // Cancel previous to ensure clean start
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(v => v.name.includes('Google US English') || v.name.includes('Samantha') || v.name.includes('Female'));
      if (femaleVoice) utterance.voice = femaleVoice;

      utterance.pitch = 1.3; // Child-like/Friendly
      utterance.rate = rate; 
      
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      
      if (stopRef.current) { resolve(); return; }
      window.speechSynthesis.speak(utterance);
    });
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // --- Helper: Robust Spoken Number Parser ---
  // Converts "twenty four" -> 24.
  // Converts "one hundred and five" -> 105.
  // Handles self-correction by prioritizing the last valid sequence if separated.
  const parseSpokenPhrase = (transcript: string): number | null => {
      const clean = transcript.toLowerCase().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim();
      
      // 1. If digits exists (e.g. "24"), use the LAST sequence found (handles corrections like "5 no 6")
      const digitMatches = clean.match(/\d+/g);
      if (digitMatches && digitMatches.length > 0) {
          return parseInt(digitMatches[digitMatches.length - 1]);
      }

      // 2. Parse number words using accumulation
      const wordValues: {[key: string]: number} = {
          zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
          ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
          seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
          sixty: 60, seventy: 70, eighty: 80, ninety: 90
      };
      const multipliers: {[key: string]: number} = {
          hundred: 100
      };

      const words = clean.split(' ');
      let currentTotal = 0;
      let hasNumber = false;
      
      for (const word of words) {
          const val = wordValues[word];
          const mult = multipliers[word];
          
          if (val !== undefined) {
              currentTotal += val;
              hasNumber = true;
          } else if (mult !== undefined) {
              currentTotal = (currentTotal || 1) * mult;
              hasNumber = true;
          } else {
              // Non-number words (like "is", "the", "apples") are ignored
              // unless we want to support separation like "4 cats". 
              // For now, accumulating everything works for "twenty four" -> 24.
          }
      }
      
      // Edge case check: if currentTotal is 0, make sure they actually said 'zero'
      if (currentTotal === 0 && !clean.includes('zero') && !hasNumber) return null;
      
      return hasNumber ? currentTotal : null;
  };

  // --- Feature: Chant (Singing) ---
  const toggleChant = async () => {
    if (mode === 'CHANTING') {
      stopRef.current = true;
      setMode('IDLE');
      setLoadingAudio(false);
      setActiveRow(null);
      return;
    }

    setMode('CHANTING');
    setLoadingAudio(true);
    stopRef.current = false;

    await speakText(`Ready? Let's sing the spell of ${number}!`);
    setLoadingAudio(false);

    if (stopRef.current) { setMode('IDLE'); return; }

    for (const factor of table) {
      if (stopRef.current) break;
      setActiveRow(factor);
      setLoadingAudio(true);

      const mathText = `${number} times ${factor} is ${number * factor}`;
      // Try Gemini Singing Voice
      const geminiAudio = await getSingingVoice(mathText);
      
      if (geminiAudio && !stopRef.current) {
        setLoadingAudio(false);
        await playGeminiAudio(geminiAudio);
      } else if (!stopRef.current) {
        setLoadingAudio(false);
        await speakText(mathText);
      }
      
      setLoadingAudio(false);
      if (!stopRef.current) await wait(2000);
    }

    setMode('IDLE');
    setActiveRow(null);
    stopRef.current = false;
  };

  // --- Feature: Recitation (Interactive) ---
  
  const listenForAnswer = (): Promise<string> => {
    return new Promise((resolve) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        resolve(""); 
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => {
        setIsListening(false);
        resolve(""); 
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };
      recognition.onerror = () => resolve("");

      try {
        recognition.start();
      } catch (e) {
        resolve("");
      }
    });
  };

  const toggleRecitation = async () => {
    if (mode === 'RECITING') {
      stopRef.current = true;
      setMode('IDLE');
      setActiveRow(null);
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert("Magical hearing (Speech Recognition) is not supported in this scroll (browser). Try Chrome!");
        return;
    }

    setMode('RECITING');
    stopRef.current = false;

    await speakText(`I will ask, and you answer. Ready?`, 0.9);

    for (const factor of table) {
      if (stopRef.current) break;
      setActiveRow(factor);

      // 1. Ask
      const question = `${number} times ${factor}?`;
      await speakText(question, 0.9); 

      if (stopRef.current) break;

      // 2. Wait to prevent echo
      await wait(600); // Increased wait time to ensure TTS is fully silent

      // 3. Listen
      const transcript = await listenForAnswer();
      
      if (stopRef.current) break;

      // 4. Verify
      const correctAnswer = number * factor;
      let isCorrect = false;
      let heardNumber: number | null = null;

      if (transcript) {
          heardNumber = parseSpokenPhrase(transcript);
          
          if (heardNumber !== null && heardNumber === correctAnswer) {
              isCorrect = true;
          }
      }

      // 5. Feedback
      if (isCorrect) {
          const praises = ["That's correct!", "You got it!", "Excellent!", "Well done!"];
          const praise = praises[Math.floor(Math.random() * praises.length)];
          await speakText(praise, 0.9); 
      } else {
          // If silence or wrong
          if (heardNumber !== null) {
              await speakText(`I heard ${heardNumber}, but the answer is ${correctAnswer}.`, 0.9);
          } else if (!transcript) {
               await speakText(`The answer is ${correctAnswer}.`, 0.9);
          } else {
              await speakText(`Actually, it is ${correctAnswer}.`, 0.9);
          }
      }
      
      await wait(1500);
    }

    setMode('IDLE');
    setActiveRow(null);
    stopRef.current = false;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 max-w-4xl mx-auto z-10 relative">
      <div className="bg-[#f3dca2] text-stone-900 p-8 rounded-sm shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-lg w-full relative rotate-1 transition-transform duration-300">
        {/* Scroll Ends */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-[110%] h-12 bg-[#d4b483] rounded-full shadow-lg border-b-4 border-[#b08d55]"></div>
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-[110%] h-12 bg-[#d4b483] rounded-full shadow-lg border-t-4 border-[#b08d55]"></div>

        <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold font-medieval text-red-900 drop-shadow-sm flex-grow text-center pl-8">
            Scroll of {number}
            </h2>
            
            <div className="flex gap-2">
                {/* Chant Button */}
                <button 
                    onClick={toggleChant}
                    disabled={mode === 'RECITING'}
                    className={`p-3 rounded-full border-2 transition-all shadow-md ${
                        mode === 'CHANTING'
                        ? 'bg-amber-100 border-amber-500 text-amber-600 animate-pulse' 
                        : 'bg-stone-100 border-stone-400 text-stone-600 hover:bg-white disabled:opacity-30'
                    }`}
                    title="Sing Mode"
                >
                    <span className="text-xl">🎵</span>
                </button>

                {/* Recite Button */}
                <button 
                    onClick={toggleRecitation}
                    disabled={mode === 'CHANTING'}
                    className={`p-3 rounded-full border-2 transition-all shadow-md relative ${
                        mode === 'RECITING'
                        ? 'bg-emerald-100 border-emerald-500 text-emerald-600' 
                        : 'bg-stone-100 border-stone-400 text-stone-600 hover:bg-white disabled:opacity-30'
                    }`}
                    title="Recite Mode"
                >
                    <span className="text-xl">🎙️</span>
                    {isListening && (
                        <span className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-pulse-ring"></span>
                    )}
                </button>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-8 font-medieval text-xl max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
          {table.map((factor) => (
            <div 
                key={factor} 
                className={`flex justify-between border-b transition-all duration-300 px-2 py-1 rounded ${
                    activeRow === factor 
                    ? 'bg-amber-200/50 border-amber-500 scale-105 shadow-sm text-red-900 font-bold' 
                    : 'border-stone-400/30 text-stone-700'
                }`}
            >
              <span>{number} × {factor}</span>
              <span className={`${activeRow === factor ? 'text-red-900' : 'text-red-800 font-bold'}`}>
                = {number * factor}
              </span>
              {activeRow === factor && loadingAudio && mode === 'CHANTING' && (
                  <span className="absolute right-0 top-0 text-xs animate-bounce">🎵</span>
              )}
               {activeRow === factor && mode === 'RECITING' && (
                  <span className="absolute right-0 top-0 text-xs animate-pulse">
                      {isListening ? "👂" : "..."}
                  </span>
              )}
            </div>
          ))}
        </div>

        <p className="text-center italic text-stone-600 mb-6 font-serif text-sm h-6">
          {mode === 'CHANTING' && loadingAudio && "Summoning the song... 🎶"}
          {mode === 'CHANTING' && !loadingAudio && "Listen and sing along! 🎤"}
          {mode === 'RECITING' && isListening && "Listening..."}
          {mode === 'RECITING' && !isListening && "Speak clearly when the ring pulses!"}
          {mode === 'IDLE' && "Select 🎵 to Sing or 🎙️ to Recite!"}
        </p>

        <div className="flex gap-4 justify-center relative z-10">
          <button 
            onClick={onBack}
            className="px-6 py-3 rounded-lg bg-stone-700 text-stone-200 font-bold font-medieval hover:bg-stone-600 border-2 border-stone-500 shadow-lg"
          >
            Retreat
          </button>
          <button 
            onClick={onStart}
            disabled={mode !== 'IDLE'}
            className={`px-8 py-3 rounded-lg text-white font-bold font-medieval border-2 shadow-lg transition-all ${
                mode !== 'IDLE' 
                ? 'bg-stone-500 border-stone-400 cursor-not-allowed opacity-50'
                : 'bg-emerald-700 hover:bg-emerald-600 border-emerald-500 animate-pulse'
            }`}
          >
            Enter Dungeon
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyScroll;
