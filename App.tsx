
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Check, RotateCcw, Pencil, HandCoins
} from 'lucide-react';
import { Step, InputMode, BweiResult, Poem, UserInfo, DivinationRecord } from './types.ts';
import { POEM_DATA } from './constants.tsx';
import { processTranscriptWithAI } from './services/gemini.ts';
import BweiVisual from './components/BweiVisual.tsx';

const DEITY_IMAGE = "https://i.ibb.co/4nprTL6r/image.jpg"; 
const TUBE_IMAGE = "https://i.ibb.co/twzyvrXg/image.jpg";
const PRAYER_IMAGE = "https://i.ibb.co/nqZqSncJ/image.jpg";

const App: React.FC = () => {
  const [step, setStep] = useState<Step>('welcome');
  const [userInfo, setUserInfo] = useState<UserInfo>({ name: '', quest: '', birthday: '', address: '' });
  const [currentPoem, setCurrentPoem] = useState<Poem | null>(null);
  const [bweiResult, setBweiResult] = useState<BweiResult>(null);
  const [isBweiAnimating, setIsBweiAnimating] = useState(false);
  const [shengCount, setShengCount] = useState(0);
  const [history, setHistory] = useState<DivinationRecord[]>([]);
  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [isRecording, setIsRecording] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [bweiMessage, setBweiMessage] = useState<string | null>(null);
  const [sessionWillSucceed, setSessionWillSucceed] = useState(false);
  const [failAtToss, setFailAtToss] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('divination_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (step === 'draw_result') {
      const timer = setTimeout(() => { setStep('bwei'); }, 2000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleFinishRecording = async () => {
    setIsRecording(false);
    setStep('drawing');
    processTranscriptWithAI("弟子誠心求籤").then(result => {
      setUserInfo(result);
    }).catch(() => {});
  };

  const startShaking = () => setIsShaking(true);
  
  const stopShaking = () => {
    if (isShaking) {
      setIsShaking(false);
      const drawnPoem = POEM_DATA[Math.floor(Math.random() * POEM_DATA.length)];
      setCurrentPoem(drawnPoem);
      setShengCount(0);
      setBweiResult(null);
      setBweiMessage(null);
      const willSucceed = Math.random() < 0.5;
      setSessionWillSucceed(willSucceed);
      if (!willSucceed) {
        setFailAtToss(Math.floor(Math.random() * 3));
      }
      setStep('draw_result');
    }
  };

  const handleCastBwei = useCallback(() => {
    if (isBweiAnimating || shengCount === 3 || bweiMessage) return;
    setIsBweiAnimating(true);
    setBweiMessage(null);
    
    setTimeout(() => {
      let result: BweiResult;
      if (sessionWillSucceed) {
        result = 'sheng';
      } else {
        if (shengCount === failAtToss) {
          result = Math.random() < 0.5 ? 'xiao' : 'yin';
        } else {
          result = 'sheng';
        }
      }
      setBweiResult(result);
      setIsBweiAnimating(false);
      
      if (result === 'sheng') {
        const newCount = shengCount + 1;
        setShengCount(newCount);
        if (newCount === 3 && currentPoem) {
          const record: DivinationRecord = { 
            ...currentPoem, ...userInfo, 
            timestamp: new Date().toLocaleString('zh-TW'), key: Date.now() 
          };
          const newHistory = [record, ...history];
          setHistory(newHistory);
          localStorage.setItem('divination_history', JSON.stringify(newHistory));
        }
      } else {
        setShengCount(0);
        setBweiMessage("未獲3聖杯，非本支籤");
        setTimeout(() => {
          setStep('drawing');
          setBweiResult(null);
          setBweiMessage(null);
        }, 1500);
      }
    }, 800);
  }, [isBweiAnimating, shengCount, currentPoem, userInfo, history, bweiMessage, sessionWillSucceed, failAtToss]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !currentPoem) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fffcf7'; ctx.fillRect(0, 0, 400, 800);
    ctx.strokeStyle = '#8b0000'; ctx.lineWidth = 10; ctx.strokeRect(15, 15, 370, 770);
    ctx.fillStyle = '#8b0000'; ctx.font = 'bold 28px serif'; ctx.textAlign = 'center';
    ctx.fillText('行天宮 雷雨師靈籤', 200, 80);
    ctx.font = '24px serif'; ctx.fillText(`${currentPoem.title}`, 200, 125);
    ctx.fillStyle = '#111'; ctx.font = 'bold 24px serif';
    currentPoem.poem.split('\n').forEach((line, i) => ctx.fillText(line, 200, 220 + (i * 50)));
    ctx.fillStyle = '#666'; ctx.font = '12px sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`求籤弟子：${userInfo.name || '弟子'}`, 50, 480);
    ctx.fillText(`所求之事：${userInfo.quest || '祈福平安'}`, 50, 510);
    ctx.fillStyle = '#8b0000'; ctx.font = 'bold 16px sans-serif'; ctx.fillText('【聖 意】', 50, 580);
    ctx.fillStyle = '#333'; ctx.font = '14px sans-serif'; ctx.fillText(currentPoem.advice, 50, 610);
    const link = document.createElement('a');
    link.download = `籤詩-${currentPoem.title}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-[#f0f0eb] overflow-hidden">
      <header className="w-full bg-[#7a0000] text-white py-2 px-6 shadow-md flex items-center justify-between z-50 shrink-0">
        <div className="w-10"></div>
        <button onClick={() => setStep('welcome')} className="hover:opacity-80 transition-opacity">
          <h1 className="text-lg md:text-xl font-black font-serif-tc tracking-widest whitespace-nowrap">行天宮線上求籤</h1>
        </button>
        <div className="w-10 flex justify-end">
          {step === 'result' && (
            <button onClick={() => setStep('history')} className="flex flex-col items-center hover:opacity-80 transition-all">
              <HandCoins size={18} />
              <span className="text-[9px] font-serif-tc font-bold">功德簿</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto p-2 md:p-4 overflow-hidden flex flex-col min-h-0">
        <div className="flex-1 bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-lg overflow-hidden flex flex-col relative border border-stone-100 min-h-0">
          
          {step === 'welcome' && (
            <div className="h-full flex flex-col md:flex-row animate-in fade-in duration-700 min-h-0">
              <div className="h-[45%] md:h-full md:w-1/2 relative overflow-hidden">
                <img src={DEITY_IMAGE} className="w-full h-full object-cover object-top" alt="Guan Yu" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
              </div>
              <div className="flex-1 md:w-1/2 p-4 md:p-10 flex flex-col justify-center items-center text-center space-y-4 md:space-y-8">
                <div className="space-y-1 md:space-y-3">
                  <h2 className="text-2xl md:text-4xl font-black text-[#7a0000] font-serif-tc tracking-[0.2em] whitespace-nowrap">恩主公靈籤</h2>
                  <p className="text-stone-500 text-xs md:text-base font-serif-tc leading-relaxed">誠心稟告，必有感應。請示心中所求。</p>
                </div>
                <button 
                  onClick={() => { setStep('input'); setInputMode('voice'); }} 
                  className="w-full max-w-[240px] bg-[#8b0000] text-white py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-lg md:text-xl shadow-md hover:bg-[#a00000] active:scale-95 transition-all"
                >
                  開始稟告
                </button>
              </div>
            </div>
          )}

          {step === 'input' && (
            <div className="h-full flex flex-col md:flex-row animate-in fade-in min-h-0">
              <div className="h-[45%] md:h-full md:w-1/2 relative overflow-hidden shrink-0">
                <img src={DEITY_IMAGE} className="w-full h-full object-cover object-top" alt="Guan Yu" />
                <div className="absolute inset-0 bg-gradient-to-t from-white md:hidden"></div>
              </div>
              <div className="flex-1 md:w-1/2 p-4 md:p-10 flex flex-col items-center justify-center space-y-4 md:space-y-6 min-h-0 overflow-hidden">
                <div className="text-center space-y-1 shrink-0">
                  <h3 className="text-xl md:text-3xl font-serif-tc font-black text-[#7a0000] tracking-widest">恭敬稟告</h3>
                  <p className="text-stone-500 text-xs md:text-sm font-serif-tc">請講述姓名、生辰及求示事項。</p>
                </div>

                {inputMode === 'voice' ? (
                  <div className="flex-1 w-full max-w-sm flex flex-col items-center justify-center space-y-4 md:space-y-6 min-h-0">
                    <div className="w-20 h-20 md:w-28 md:h-28 overflow-hidden relative shrink-0">
                      <img src={PRAYER_IMAGE} className={`w-full h-full object-contain transition-all duration-1000 mix-blend-multiply ${isRecording ? 'animate-pulse scale-110' : 'opacity-60 grayscale'}`} alt="Praying" />
                    </div>
                    <div className="w-full flex flex-col items-center">
                      <p className="text-[#8b0000] font-serif-tc text-base md:text-xl font-bold mb-4">{isRecording ? "恩主公正在傾聽..." : "請誠心稟告"}</p>
                      <button onClick={handleFinishRecording} className="w-1/2 md:w-full bg-[#8b0000] text-white py-3 md:py-4 rounded-xl font-bold text-lg shadow-md">稟告完畢</button>
                      <button onClick={() => setInputMode('manual')} className="text-stone-400 text-[10px] md:text-xs flex items-center gap-1 hover:text-red-800 underline mt-3"><Pencil size={10} /> 改用文字輸入</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 w-full max-w-md flex flex-col space-y-3 md:space-y-4 min-h-0 overflow-hidden">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="姓名" className="w-full p-2 bg-stone-50 rounded-lg border border-stone-200 text-xs md:text-sm outline-none" value={userInfo.name} onChange={e => setUserInfo({...userInfo, name: e.target.value})} />
                      <input type="text" placeholder="生辰" className="w-full p-2 bg-stone-50 rounded-lg border border-stone-200 text-xs md:text-sm outline-none" value={userInfo.birthday} onChange={e => setUserInfo({...userInfo, birthday: e.target.value})} />
                    </div>
                    <textarea placeholder="請詳述欲請示之事項..." className="flex-1 w-full p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs md:text-sm outline-none resize-none font-serif-tc" value={userInfo.quest} onChange={e => setUserInfo({...userInfo, quest: e.target.value})} />
                    <button onClick={() => setStep('drawing')} className="w-full bg-[#8b0000] text-white py-3 md:py-4 rounded-xl font-bold text-lg shadow-md">確認並求籤</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'drawing' && (
            <div className="h-full flex flex-col items-center justify-center p-4 space-y-6 md:space-y-12 animate-in zoom-in min-h-0">
              <div className="text-center space-y-1">
                <h3 className="text-2xl md:text-4xl font-serif-tc font-black text-[#7a0000] tracking-widest">搖動籤筒</h3>
                <p className="text-stone-400 italic font-serif-tc text-[10px] md:text-sm">請按住籤筒搖動，放開即得籤</p>
              </div>
              <div className="relative w-40 md:w-56 aspect-square flex items-center justify-center shrink-0">
                <div 
                  onMouseDown={startShaking} onTouchStart={startShaking}
                  onMouseUp={stopShaking} onTouchEnd={stopShaking}
                  className={`w-full h-full cursor-pointer flex items-center justify-center ${isShaking ? '' : 'animate-[wiggle_2s_infinite]'}`}
                >
                  <img src={TUBE_IMAGE} className={`h-full w-auto object-contain mix-blend-multiply transition-all ${isShaking ? 'animate-[shake_0.1s_infinite] scale-110' : 'hover:scale-105'}`} alt="籤筒" />
                </div>
              </div>
              <div className="text-stone-400 text-[10px] animate-pulse font-serif-tc text-center">
                {isShaking ? "感應靈籤中..." : "滑鼠按住籤筒開始搖動"}
              </div>
            </div>
          )}

          {step === 'draw_result' && currentPoem && (
            <div className="h-full flex flex-col items-center justify-center p-4 space-y-6 md:space-y-12 animate-in slide-in-from-right min-h-0">
              <div className="text-center space-y-3">
                <p className="text-stone-400 font-serif-tc text-base tracking-widest">抽取結果</p>
                <div className="w-20 h-px bg-red-100 mx-auto"></div>
                <h3 className="text-3xl md:text-5xl font-black text-[#7a0000] font-serif-tc tracking-widest my-2">{currentPoem.title}</h3>
                <div className="w-20 h-px bg-red-100 mx-auto"></div>
              </div>
              <div className="flex flex-col items-center gap-2 text-[#8b0000] font-black text-lg font-serif-tc">
                <span>準備擲筊確認</span>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-[#8b0000] rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-[#8b0000] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1 h-1 bg-[#8b0000] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}

          {step === 'bwei' && (
            <div className="h-full flex flex-col items-center justify-center p-4 animate-in slide-in-from-bottom min-h-0 space-y-2 md:space-y-6">
              <div className="text-center shrink-0">
                <h4 className="text-[#8b0000] font-bold text-sm md:text-lg font-serif-tc">【 {currentPoem?.title} 】</h4>
                <h3 className="text-xl md:text-2xl font-serif-tc font-black text-stone-800 tracking-widest">擲筊請示</h3>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-md min-h-0 py-2">
                <div onClick={handleCastBwei} className="w-24 md:w-36 cursor-pointer shrink-0 my-2 md:my-4 transition-transform hover:scale-105 active:scale-95">
                  <BweiVisual result={bweiResult} isAnimating={isBweiAnimating} />
                </div>
                
                <div className="flex flex-col items-center space-y-2 md:space-y-6 w-full">
                  <div className="h-12 md:h-20 flex flex-col items-center justify-center shrink-0">
                    {bweiResult && !isBweiAnimating ? (
                      <div className="text-center space-y-1 animate-in zoom-in">
                        <div className="text-3xl md:text-5xl font-black font-serif-tc text-[#7a0000]">【 {bweiResult === 'sheng' ? '聖 筊' : bweiResult === 'xiao' ? '笑 筊' : '陰 筊'} 】</div>
                        {bweiMessage && <p className="text-red-600 font-bold text-[10px] md:text-xs bg-red-50 px-3 py-0.5 rounded-full shadow-sm">{bweiMessage}</p>}
                      </div>
                    ) : (
                      <p className="text-stone-400 text-[10px] md:text-sm italic animate-pulse font-serif-tc text-center">點擊筊杯擲筊，需連續獲三次聖筊</p>
                    )}
                  </div>

                  <div className="flex gap-3 md:gap-5 shrink-0">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`w-8 h-8 md:w-10 md:h-10 rounded-full border-2 flex items-center justify-center transition-all ${shengCount >= i ? 'bg-green-600 border-green-200 text-white shadow-md' : 'bg-stone-50 border-stone-200 text-stone-300'}`}>
                        {shengCount >= i ? <Check size={18} strokeWidth={4} /> : <span className="text-xs font-bold">{i}</span>}
                      </div>
                    ))}
                  </div>

                  <div className="h-10 md:h-14 flex items-center justify-center shrink-0">
                    {shengCount === 3 && !isBweiAnimating && (
                      <button onClick={() => setStep('result')} className="px-10 bg-green-700 text-white py-2 md:py-3 rounded-xl font-bold text-lg shadow-md animate-bounce hover:bg-green-800 transition-colors">領取籤詩</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && currentPoem && (
            <div className="h-full flex flex-col md:flex-row p-3 md:p-10 gap-2 md:gap-8 overflow-hidden min-h-0">
              <div className="h-[40%] md:h-full md:w-1/2 flex flex-col items-center justify-center p-3 md:p-6 bg-[#fffcf7] rounded-2xl md:rounded-[3rem] shadow-sm border-2 md:border-4 border-[#7a0000] relative shrink-0">
                <div className="text-center mb-2 md:mb-6">
                  <h3 className="text-base md:text-2xl font-black text-[#7a0000] font-serif-tc">雷雨師靈籤</h3>
                  <p className="text-[10px] md:text-sm font-serif-tc text-stone-600">{currentPoem.title}</p>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-1 md:gap-4 font-serif-tc">
                   {currentPoem.poem.split('\n').map((line, idx) => (
                     <p key={idx} className="text-lg md:text-4xl font-black tracking-widest text-stone-800 text-center leading-tight">{line}</p>
                   ))}
                </div>
              </div>
              <div className="flex-1 md:w-1/2 flex flex-col justify-center space-y-3 md:space-y-8 overflow-hidden min-h-0">
                <div className="flex-1 space-y-4 md:space-y-10 overflow-y-auto pr-1 scrollbar-hide flex flex-col justify-center">
                   <div className="space-y-1 md:space-y-3">
                      {/* 調整標題字級：手機 sm, 電腦 xl (按鈕是 base/2xl) */}
                      <p className="font-bold text-[#7a0000] font-serif-tc text-sm md:text-xl flex items-center gap-2"><span className="w-1.5 h-1.5 md:w-3 md:h-3 bg-[#7a0000] rounded-full"></span> 聖 意</p>
                      {/* 調整內文字級：手機 11px, 電腦 lg */}
                      <p className="text-stone-700 leading-relaxed font-serif-tc pl-4 text-[11px] md:text-lg">{currentPoem.advice}</p>
                   </div>
                   <div className="space-y-1 md:space-y-3">
                      <p className="font-bold text-[#7a0000] font-serif-tc text-sm md:text-xl flex items-center gap-2"><span className="w-1.5 h-1.5 md:w-3 md:h-3 bg-[#7a0000] rounded-full"></span> 解 說</p>
                      <p className="text-stone-700 leading-relaxed font-serif-tc pl-4 text-[11px] md:text-lg">{currentPoem.explanation}</p>
                   </div>
                </div>
                <div className="flex flex-col items-center gap-1 shrink-0 pt-2 pb-2 md:pb-6">
                  {/* 主要按鈕字級維持：手機 base, 電腦 2xl */}
                  <button onClick={downloadImage} className="w-[70%] bg-[#8b0000] text-white py-2.5 md:py-5 rounded-lg md:rounded-2xl font-bold text-base md:text-2xl shadow-md active:scale-95 transition-all">
                    留存籤詩
                  </button>
                  <button onClick={() => setStep('welcome')} className="py-1 text-stone-400 text-[10px] md:text-base font-bold flex items-center justify-center gap-1 hover:text-[#8b0000]"><RotateCcw size={14} /> 再求一籤</button>
                </div>
              </div>
              <canvas ref={canvasRef} width="400" height="800" className="hidden"></canvas>
            </div>
          )}

          {step === 'history' && (
            <div className="h-full flex flex-col animate-in slide-in-from-right bg-white overflow-hidden min-h-0">
               <div className="bg-stone-50 p-3 flex items-center justify-between border-b border-stone-100 shrink-0">
                  <h3 className="text-lg font-black font-serif-tc text-[#7a0000]">功德簿</h3>
                  <button onClick={() => setStep('result')} className="text-stone-600 text-[10px] md:text-sm font-bold px-3 py-1 bg-white rounded-full border border-stone-200">返回</button>
              </div>
              <div className="flex-1 p-3 overflow-y-auto scrollbar-hide min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {history.length === 0 ? (
                    <div className="col-span-full py-20 text-center opacity-10 italic text-xl">尚無紀錄</div>
                  ) : (
                    history.map(item => (
                      <div key={item.key} onClick={() => { setCurrentPoem(item); setStep('result'); }} className="p-3 bg-stone-50 rounded-xl border-l-4 border-[#8b0000] cursor-pointer hover:bg-stone-100 transition-all group">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-bold text-sm text-[#7a0000] font-serif-tc">{item.title}</span>
                          <span className="text-[8px] text-stone-400 font-mono">{item.timestamp}</span>
                        </div>
                        <p className="text-stone-500 font-serif-tc text-[10px] line-clamp-1 italic">{item.poem.replace(/\n/g, ' ')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full py-1.5 text-center text-stone-400 text-[8px] md:text-[10px] font-serif-tc border-t border-stone-200 shrink-0">
        <p>© 2025 行天宮線上求籤系統 · AI 輔助版</p>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          25% { transform: translateX(-4px) rotate(-2deg); }
          75% { transform: translateX(4px) rotate(2deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-2deg); }
          50% { transform: rotate(2deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
