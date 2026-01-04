
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Download, Check, RotateCcw, Pencil, HandCoins, ArrowRight
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
      const timer = setTimeout(() => {
        setStep('bwei');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleFinishRecording = async () => {
    setIsRecording(false);
    setStep('drawing');
    // For demo purposes, we simulate the AI processing if transcript is empty
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
        }, 2500);
      }
    }, 1200);
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
    <div className="min-h-screen flex flex-col items-center">
      <header className="w-full bg-[#7a0000] text-white py-6 px-8 shadow-xl flex items-center justify-between sticky top-0 z-50">
        <div className="flex-1"></div>
        <button onClick={() => setStep('welcome')} className="hover:opacity-80 transition-opacity">
          <h1 className="text-2xl md:text-4xl font-black font-serif-tc tracking-[0.3em]">行天宮線上求籤</h1>
        </button>
        <div className="flex-1 flex justify-end">
          <button onClick={() => setStep('history')} className="flex flex-col items-center gap-1 hover:bg-white/10 p-2 px-6 rounded-2xl transition-all">
            <HandCoins size={28} />
            <span className="text-xs font-serif-tc font-bold">功德簿</span>
          </button>
        </div>
      </header>

      <main className="w-full max-w-6xl flex-1 flex flex-col items-center py-12 px-6">
        <div className="w-full bg-white rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col min-h-[700px] border border-stone-100 relative transition-all duration-700">
          
          {step === 'welcome' && (
            <div className="flex-1 flex flex-col md:flex-row animate-in fade-in duration-1000">
              <div className="md:w-1/2 relative h-80 md:h-auto overflow-hidden">
                <img src={DEITY_IMAGE} className="w-full h-full object-cover object-top" alt="Guan Yu" />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/50 to-transparent"></div>
              </div>
              <div className="md:w-1/2 p-12 md:p-20 flex flex-col justify-center space-y-10">
                <div className="space-y-6">
                  <h2 className="text-5xl md:text-7xl font-black text-[#7a0000] font-serif-tc tracking-widest leading-tight">恩主公靈籤</h2>
                  <p className="text-stone-500 text-2xl font-serif-tc leading-relaxed">誠心稟告，必有感應。<br/>請向 恩主公請示心中所求。</p>
                </div>
                <button 
                  onClick={() => { setStep('input'); setInputMode('voice'); }} 
                  className="w-full bg-[#8b0000] text-white py-8 rounded-[2rem] font-bold text-3xl shadow-2xl hover:bg-[#a00000] active:scale-95 transition-all flex items-center justify-center gap-6 group"
                >
                  開始稟告 <ArrowRight size={32} className="group-hover:translate-x-3 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {step === 'input' && (
            <div className="flex-1 flex flex-col md:flex-row animate-in fade-in">
              <div className="md:w-1/4 h-48 md:h-auto relative overflow-hidden bg-stone-50">
                <img src={DEITY_IMAGE} className="w-full h-full object-cover object-top opacity-30 grayscale" alt="Guan Yu" />
              </div>
              <div className="md:w-3/4 p-12 md:p-24 flex flex-col items-center justify-center space-y-12">
                <div className="text-center space-y-4">
                  <h3 className="text-5xl font-serif-tc font-black text-[#7a0000] tracking-widest">恭敬稟告</h3>
                  <p className="text-stone-500 text-xl font-serif-tc">請詳述您的姓名、生辰，以及欲請示之事項。</p>
                </div>

                {inputMode === 'voice' ? (
                  <div className="w-full max-w-lg flex flex-col items-center space-y-16">
                    <div className="w-48 h-48 rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-red-50 relative shrink-0">
                      <img 
                        src={PRAYER_IMAGE} 
                        className={`w-full h-full object-cover transition-all duration-1000 ${isRecording ? 'animate-pulse scale-110' : 'opacity-40 grayscale'}`} 
                        alt="Praying" 
                      />
                    </div>
                    <div className="w-full space-y-8 flex flex-col items-center">
                      <p className="text-[#8b0000] font-serif-tc text-2xl font-bold">{isRecording ? "恩主公正在傾聽..." : "準備好後請開口..."}</p>
                      <button onClick={handleFinishRecording} className="w-full bg-[#8b0000] text-white py-7 rounded-[2rem] font-bold text-3xl shadow-2xl hover:bg-[#a00000] transition-all active:scale-95">稟告完畢</button>
                      <button onClick={() => setInputMode('manual')} className="text-stone-400 text-base flex items-center gap-2 hover:text-red-800 underline transition-colors"><Pencil size={18} /> 改用文字輸入</button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-2xl flex flex-col space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <input type="text" placeholder="弟子姓名" className="w-full p-6 bg-stone-50 rounded-[1.5rem] border-2 border-stone-200 text-xl outline-none focus:border-[#8b0000] transition-colors" value={userInfo.name} onChange={e => setUserInfo({...userInfo, name: e.target.value})} />
                      <input type="text" placeholder="生辰 (例如: 民國xx年x月x日)" className="w-full p-6 bg-stone-50 rounded-[1.5rem] border-2 border-stone-200 text-xl outline-none focus:border-[#8b0000] transition-colors" value={userInfo.birthday} onChange={e => setUserInfo({...userInfo, birthday: e.target.value})} />
                    </div>
                    <textarea placeholder="請在此詳述欲請示之事項..." className="w-full p-8 bg-stone-50 rounded-[1.5rem] border-2 border-stone-200 h-60 text-xl outline-none focus:border-[#8b0000] transition-colors resize-none font-serif-tc" value={userInfo.quest} onChange={e => setUserInfo({...userInfo, quest: e.target.value})} />
                    <button onClick={() => setStep('drawing')} className="w-full bg-[#8b0000] text-white py-7 rounded-[2rem] font-bold text-3xl shadow-2xl hover:bg-[#a00000] active:scale-95 transition-all">確認並開始求籤</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'drawing' && (
            <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in p-16">
              <div className="text-center space-y-6 mb-16">
                <h3 className="text-6xl font-serif-tc font-black text-[#7a0000] tracking-[0.4em]">搖動籤筒</h3>
                <p className="text-stone-400 italic font-serif-tc text-2xl">誠心祈求後，搖動籤筒抽取靈籤</p>
              </div>
              <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
                <div 
                  onMouseDown={startShaking} onTouchStart={startShaking}
                  onMouseUp={stopShaking} onTouchEnd={stopShaking}
                  className={`w-full h-full cursor-pointer flex items-center justify-center ${isShaking ? '' : 'animate-[wiggle_2s_infinite]'}`}
                >
                  <img src={TUBE_IMAGE} className={`h-full w-auto object-contain mix-blend-multiply transition-all duration-300 ${isShaking ? 'animate-[shake_0.1s_infinite] scale-110 drop-shadow-[0_20px_50px_rgba(139,0,0,0.3)]' : 'hover:scale-105'}`} alt="籤筒" />
                </div>
              </div>
              <div className="mt-16 text-stone-400 text-xl animate-pulse font-serif-tc text-center">
                {isShaking ? "正在感應靈籤..." : "滑鼠按住籤筒開始搖動，放開後即得籤"}
              </div>
            </div>
          )}

          {step === 'draw_result' && currentPoem && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 md:p-24 space-y-16 animate-in slide-in-from-right">
              <div className="text-center space-y-8">
                <p className="text-stone-400 font-serif-tc text-2xl tracking-[0.5em] uppercase">抽取結果</p>
                <div className="w-80 h-1 bg-red-100 mx-auto rounded-full"></div>
                <h3 className="text-8xl md:text-[10rem] font-black text-[#7a0000] font-serif-tc tracking-[0.2em] my-8 drop-shadow-sm">{currentPoem.title}</h3>
                <div className="w-80 h-1 bg-red-100 mx-auto rounded-full"></div>
              </div>
              <div className="mt-12 flex flex-col items-center gap-6 text-[#8b0000] font-black text-4xl font-serif-tc">
                <span>即將進行擲筊確認</span>
                <div className="flex gap-2">
                  <div className="w-3 h-3 bg-[#8b0000] rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-[#8b0000] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-3 h-3 bg-[#8b0000] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}

          {step === 'bwei' && (
            <div className="flex-1 flex flex-col items-center justify-center p-12 animate-in slide-in-from-bottom">
              <div className="text-center space-y-4 mb-12">
                <h4 className="text-[#8b0000] font-bold text-3xl font-serif-tc">【 {currentPoem?.title} 】</h4>
                <h3 className="text-5xl font-serif-tc font-black text-stone-800 tracking-widest">擲筊請示</h3>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl">
                <div onClick={handleCastBwei} className="transform cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]">
                  <BweiVisual result={bweiResult} isAnimating={isBweiAnimating} />
                </div>
                
                <div className="mt-12 flex flex-col items-center space-y-12 w-full">
                  <div className="h-40 flex flex-col items-center justify-center space-y-6">
                    {bweiResult && !isBweiAnimating ? (
                      <div className="text-center space-y-4 animate-in zoom-in">
                        <div className="text-7xl md:text-9xl font-black font-serif-tc text-[#7a0000] drop-shadow-2xl">
                          【 {bweiResult === 'sheng' ? '聖 筊' : bweiResult === 'xiao' ? '笑 筊' : '陰 筊'} 】
                        </div>
                        {bweiMessage && <p className="text-red-600 font-black text-3xl animate-pulse bg-red-50 px-10 py-4 rounded-full border-2 border-red-100 shadow-sm">{bweiMessage}</p>}
                      </div>
                    ) : (
                      <p className="text-stone-400 text-2xl italic animate-pulse font-serif-tc">點擊筊杯擲筊，需連續獲三次聖筊</p>
                    )}
                  </div>

                  {/* Checkmarks centered between result and button */}
                  <div className="flex gap-12 py-8">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`w-24 h-24 rounded-full border-4 flex items-center justify-center transition-all duration-700 ${shengCount >= i ? 'bg-green-600 border-green-200 text-white shadow-2xl scale-110' : 'bg-stone-50 border-stone-200 text-stone-300'}`}>
                        {shengCount >= i ? <Check size={56} strokeWidth={5} /> : <span className="text-3xl font-bold">{i}</span>}
                      </div>
                    ))}
                  </div>

                  <div className="h-32 flex items-center justify-center w-full">
                    {shengCount === 3 && !isBweiAnimating && (
                      <button onClick={() => setStep('result')} className="px-24 bg-green-700 text-white py-7 rounded-[2.5rem] font-bold text-3xl shadow-2xl animate-bounce hover:bg-green-800 transition-all">
                        領取籤詩
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && currentPoem && (
            <div className="flex-1 flex flex-col md:flex-row animate-in fade-in duration-1000 p-10 md:p-20 gap-16">
              <div className="md:w-1/2 flex flex-col items-center justify-center p-12 bg-[#fffcf7] rounded-[4rem] shadow-2xl border-8 border-[#7a0000] relative">
                <div className="absolute inset-6 border border-[#7a0000]/10 rounded-[3.5rem] pointer-events-none"></div>
                <div className="text-center mb-12">
                  <h3 className="text-4xl font-black text-[#7a0000] font-serif-tc tracking-widest mb-6">行天宮 雷雨師靈籤</h3>
                  <p className="text-3xl font-serif-tc text-[#7a0000] font-bold">{currentPoem.title}</p>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-8 font-serif-tc">
                   {currentPoem.poem.split('\n').map((line, idx) => (
                     <p key={idx} className="text-4xl md:text-5xl font-black tracking-[0.3em] text-stone-800 text-center leading-relaxed drop-shadow-sm">{line}</p>
                   ))}
                </div>
              </div>
              <div className="md:w-1/2 flex flex-col space-y-12 py-6">
                <div className="flex-1 space-y-10 overflow-y-auto max-h-[500px] pr-6 scrollbar-hide">
                   <div className="space-y-4">
                      <p className="font-bold text-[#7a0000] text-2xl font-serif-tc tracking-widest flex items-center gap-4"><span className="w-4 h-4 bg-[#7a0000] rounded-full"></span> 聖 意</p>
                      <p className="text-stone-700 font-serif-tc leading-relaxed text-2xl pl-8">{currentPoem.advice}</p>
                   </div>
                   <div className="space-y-4">
                      <p className="font-bold text-[#7a0000] text-2xl font-serif-tc tracking-widest flex items-center gap-4"><span className="w-4 h-4 bg-[#7a0000] rounded-full"></span> 解 說</p>
                      <p className="text-stone-700 font-serif-tc leading-relaxed text-2xl pl-8">{currentPoem.explanation}</p>
                   </div>
                </div>
                <div className="space-y-6">
                  <button onClick={downloadImage} className="w-full bg-[#8b0000] text-white py-7 rounded-[2rem] font-bold text-3xl flex items-center justify-center gap-4 shadow-2xl hover:bg-[#a00000] transition-all active:scale-95"><Download size={36} /> 留存籤詩 (下載)</button>
                  <button onClick={() => setStep('welcome')} className="w-full py-5 text-stone-400 text-xl font-bold flex items-center justify-center gap-3 hover:text-[#8b0000] transition-colors"><RotateCcw size={24} /> 再求一籤</button>
                </div>
              </div>
              <canvas ref={canvasRef} width="400" height="800" className="hidden"></canvas>
            </div>
          )}

          {step === 'history' && (
            <div className="flex-1 flex flex-col md:flex-row animate-in slide-in-from-right bg-white overflow-hidden min-h-[70vh]">
               <div className="md:w-1/3 bg-stone-50 p-16 flex flex-col items-center justify-center text-center space-y-12 border-r border-stone-100">
                  <div className="w-56 h-56 bg-white rounded-full flex items-center justify-center shadow-xl">
                    <HandCoins size={120} className="text-yellow-600 animate-bounce" />
                  </div>
                  <h3 className="text-5xl font-black font-serif-tc text-[#7a0000] tracking-widest">功德簿</h3>
                  <button onClick={() => setStep('welcome')} className="w-full bg-stone-800 text-white py-6 rounded-[1.5rem] font-bold text-2xl hover:bg-black transition-colors">返回首頁</button>
              </div>
              <div className="md:w-2/3 p-12 md:p-20 overflow-y-auto max-h-[70vh] scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {history.length === 0 ? (
                    <div className="col-span-full py-60 text-center opacity-10 italic font-serif-tc text-5xl">尚無求籤紀錄</div>
                  ) : (
                    history.map(item => (
                      <div key={item.key} onClick={() => { setCurrentPoem(item); setStep('result'); }} className="p-10 bg-stone-50 rounded-[2.5rem] shadow-md border-l-[12px] border-[#8b0000] cursor-pointer hover:bg-stone-100 transition-all hover:scale-[1.04] group">
                        <div className="flex justify-between items-center mb-6">
                          <span className="font-black text-3xl text-[#7a0000] font-serif-tc group-hover:underline">{item.title}</span>
                          <span className="text-xs text-stone-400 font-mono bg-white px-3 py-1 rounded-full">{item.timestamp}</span>
                        </div>
                        <p className="text-stone-500 font-serif-tc leading-relaxed line-clamp-2 italic text-xl">{item.poem.replace(/\n/g, ' ')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full py-16 text-center text-stone-400 text-xl font-serif-tc border-t border-stone-200 mt-16">
        <p>© 2025 行天宮線上求籤系統 · AI 輔助版</p>
        <p className="mt-4 text-stone-300">誠心祈求，指引迷津。本系統僅供參考。</p>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          25% { transform: translateX(-10px) rotate(-4deg); }
          75% { transform: translateX(10px) rotate(4deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@900&display=swap');
      `}</style>
    </div>
  );
};

export default App;
