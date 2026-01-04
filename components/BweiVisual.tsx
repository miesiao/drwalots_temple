
import React from 'react';
import { BweiResult } from '../types.ts';

interface BweiVisualProps {
  result: BweiResult;
  isAnimating: boolean;
}

const BWEI_IMAGES = {
  sheng: "https://i.ibb.co/whhP6G4p/1.jpg",
  yin: "https://i.ibb.co/WppDkpFr/2.jpg",
  xiao: "https://i.ibb.co/hFFgmHFS/3.jpg",
  standing: "https://i.ibb.co/whhP6G4p/1.jpg",
};

const BweiVisual: React.FC<BweiVisualProps> = ({ result, isAnimating }) => {
  if (isAnimating) {
    return (
      <div className="flex items-center justify-center">
        <div className="w-48 h-48 md:w-64 md:h-64 animate-[bounce_0.6s_infinite] flex items-center justify-center">
          <img 
            src={BWEI_IMAGES.sheng} 
            className="w-full h-full object-contain rounded-full animate-[spin_0.8s_linear_infinite] mix-blend-multiply" 
            alt="tossing" 
          />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex items-center justify-center">
        <div className="w-48 h-48 md:w-64 md:h-64">
          <img src={BWEI_IMAGES.sheng} className="w-full h-full object-contain mix-blend-multiply opacity-80" alt="idle" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center animate-in zoom-in duration-300">
      <div className="w-64 h-64 md:w-80 md:h-80 relative">
        <img 
          src={BWEI_IMAGES[result]} 
          className="w-full h-full object-contain drop-shadow-md mix-blend-multiply" 
          alt={result} 
        />
      </div>
      {result === 'standing' && (
        <div className="mt-4 text-yellow-600 font-black animate-pulse text-xl tracking-widest">【 神 蹟 立 筊 】</div>
      )}
    </div>
  );
};

export default BweiVisual;
