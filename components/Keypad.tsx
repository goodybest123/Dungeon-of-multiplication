
import React from 'react';

interface KeypadProps {
  onPress: (val: number | string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}

const Keypad: React.FC<KeypadProps> = ({ onPress, onDelete, onSubmit, disabled }) => {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <div className="grid grid-cols-3 gap-3 w-full mx-auto">
      {keys.map((num) => (
        <button
          key={num}
          onClick={() => onPress(num)}
          disabled={disabled}
          className="bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-2xl font-bold py-3 lg:py-4 rounded-lg shadow-[0_4px_0_0_rgba(76,29,149,1)] border-2 border-violet-800 transition-all disabled:opacity-50 active:translate-y-1 active:shadow-none font-medieval"
        >
          {num}
        </button>
      ))}
      <button
        onClick={onDelete}
        disabled={disabled}
        className="bg-red-800 hover:bg-red-700 active:bg-red-900 text-red-100 text-xl font-bold py-3 lg:py-4 rounded-lg shadow-[0_4px_0_0_rgba(153,27,27,1)] border-2 border-red-950 transition-all disabled:opacity-50 active:translate-y-1 active:shadow-none"
      >
        ←
      </button>
      <button
        onClick={() => onPress(0)}
        disabled={disabled}
        className="bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white text-2xl font-bold py-3 lg:py-4 rounded-lg shadow-[0_4px_0_0_rgba(76,29,149,1)] border-2 border-violet-800 transition-all disabled:opacity-50 active:translate-y-1 active:shadow-none font-medieval"
      >
        0
      </button>
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-emerald-100 text-xl font-bold py-3 lg:py-4 rounded-lg shadow-[0_4px_0_0_rgba(6,78,59,1)] border-2 border-emerald-800 transition-all disabled:opacity-50 active:translate-y-1 active:shadow-none font-medieval"
      >
        CAST
      </button>
    </div>
  );
};

export default Keypad;
