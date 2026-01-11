
import React, { useState, useEffect } from 'react';

interface LockScreenProps {
  onUnlock: () => void;
  correctPin: string;
}

const LockScreen: React.FC<LockScreenProps> = ({ onUnlock, correctPin }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => setPin(''), 500);
      }
    }
  }, [pin, correctPin, onUnlock]);

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>

      <div className="relative z-10 flex flex-col items-center max-w-xs w-full px-6">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/30">
          <i className="fa-solid fa-shield-halved text-3xl text-white"></i>
        </div>

        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">보안 접근</h2>
        <p className="text-slate-400 text-sm mb-12 text-center font-medium">관리자 PIN 번호 4자리를 입력하세요.</p>

        {/* PIN Indicators */}
        <div className={`flex gap-4 mb-16 ${error ? 'animate-bounce text-rose-500' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                pin.length > i 
                  ? (error ? 'bg-rose-500 border-rose-500 scale-110' : 'bg-indigo-500 border-indigo-500 scale-110 shadow-[0_0_15px_rgba(99,102,241,0.5)]') 
                  : 'border-slate-700'
              }`}
            ></div>
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="w-full aspect-square rounded-2xl bg-white/5 border border-white/10 text-xl font-bold text-white hover:bg-white/10 active:scale-90 transition-all backdrop-blur-sm"
            >
              {num}
            </button>
          ))}
          <div className="w-full aspect-square"></div>
          <button
            onClick={() => handleKeyPress('0')}
            className="w-full aspect-square rounded-2xl bg-white/5 border border-white/10 text-xl font-bold text-white hover:bg-white/10 active:scale-90 transition-all backdrop-blur-sm"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="w-full aspect-square rounded-2xl text-slate-400 hover:text-white flex items-center justify-center active:scale-90 transition-all"
          >
            <i className="fa-solid fa-delete-left text-xl"></i>
          </button>
        </div>

        {error && <p className="mt-8 text-rose-500 font-bold text-sm">잘못된 PIN 번호입니다.</p>}
      </div>
    </div>
  );
};

export default LockScreen;
