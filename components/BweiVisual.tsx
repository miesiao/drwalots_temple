
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
        <div className="w-20 h-20 md:w-28 md:h-28 animate-[bounce_0.6s_infinite] flex items-center justify-center">
          <img src={BWEI_IMAGES.sheng} className="w-full h-full object-contain rounded-full animate-[spin_0.8s_linear_infinite] mix-blend-multiply" alt="tossing" />
        </div>
      </div>
    );
  }

  // 待機狀態使用彩色圖，但不顯示為黑白，而是降低透明度的彩色 (去背處理)
  if (!result) {
    return (
      <div className="flex items-center justify-center">
        <div className="w-20 h-20 md:w-28 md:h-28">
          <img src={BWEI_IMAGES.sheng} className="w-full h-full object-contain mix-blend-multiply opacity-60" alt="idle" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center animate-in zoom-in duration-300">
      <div className="w-24 h-24 md:w-32 md:h-32">
        <img src={BWEI_IMAGES[result]} className="w-full h-full object-contain mix-blend-multiply" alt={result} />
      </div>
      {result === 'standing' && (
        <div className="mt-1 text-yellow-600 font-black animate-pulse text-[10px] md:text-xs">【 神 蹟 立 筊 】</div>
      )}
    </div>
  );
};

export default BweiVisual;
