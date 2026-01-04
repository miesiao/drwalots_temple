
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
  const [tempTranscript, setTempTranscript] = useState("");
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
    processTranscriptWithAI(tempTranscript || "弟子誠心求籤").then(result => {
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
        }, 2000);
      }
    }, 1000);
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
    ctx.font = '20px serif'; ctx.fillText(`${currentPoem.title}`, 200, 125);
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
    <div className="min-h-screen bg-[#f5f5f0] text-stone-900 flex flex-col items-center select-none font-sans overflow-x-hidden">
      <header className="w-full bg-red-900 text-white py-5 px-6 shadow-md flex items-center justify-between sticky top-0 z-50">
        <div className="flex-1"></div>
        <button onClick={() => setStep('welcome')} className="hover:opacity-80 transition-opacity">
          <h1 className="text-2xl md:text-3xl font-black font-serif-tc tracking-widest">行天宮線上求籤</h1>
        </button>
        <div className="flex-1 flex justify-end">
          <button onClick={() => setStep('history')} className="flex flex-col items-center gap-1 hover:bg-white/10 p-2 px-4 rounded-xl transition-colors">
            <HandCoins size={24} />
            <span className="text-xs font-serif-tc font-bold">功德簿</span>
          </button>
        </div>
      </header>

      <main className="w-full max-w-5xl flex-1 flex flex-col items-center py-8 md:py-16 px-4">
        <div className="w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col min-h-[600px] border border-stone-200 relative transition-all duration-500">
          
          {step === 'welcome' && (
            <div className="flex-1 flex flex-col md:flex-row animate-in fade-in duration-700">
              <div className="md:w-1/2 relative h-64 md:h-auto overflow-hidden">
                <img src={DEITY_IMAGE} className="w-full h-full object-cover object-top" alt="Guan Yu" />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/40 to-transparent"></div>
              </div>
              <div className="md:w-1/2 p-10 md:p-16 flex flex-col justify-center space-y-8">
                <div className="space-y-4">
                  <h2 className="text-4xl md:text-6xl font-black text-red-900 font-serif-tc tracking-widest leading-tight">恩主公靈籤</h2>
                  <p className="text-stone-500 text-xl font-serif-tc leading-relaxed">弟子誠心祈求，必有感應。<br/>請向 恩主公稟告您的心願，指引迷津。</p>
                </div>
                <button 
                  onClick={() => { setStep('input'); setInputMode('voice'); }} 
                  className="w-full bg-red-800 text-white py-6 rounded-2xl font-bold text-2xl shadow-xl hover:bg-red-900 active:scale-95 transition-all flex items-center justify-center gap-4 group"
                >
                  開始稟告 <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {step === 'input' && (
            <div className="flex-1 flex flex-col md:flex-row animate-in fade-in duration-500">
              <div className="md:w-1/3 h-48 md:h-auto relative overflow-hidden">
                <img src={DEITY_IMAGE} className="w-full h-full object-cover object-top" alt="Guan Yu" />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-white via-transparent to-transparent"></div>
              </div>
              <div className="md:w-2/3 p-10 md:p-20 flex flex-col items-center justify-center space-y-10">
                <div className="text-center space-y-3">
                  <h3 className="text-4xl font-serif-tc font-black text-red-900 tracking-widest">恭敬稟告</h3>
                  <p className="text-stone-500 text-lg font-serif-tc">請講述您的姓名、生辰，以及欲請示之事項。</p>
                </div>

                {inputMode === 'voice' ? (
                  <div className="w-full max-w-md flex flex-col items-center space-y-12">
                    <div className="w-40 h-40 rounded-full overflow-hidden shadow-xl border-4 border-red-50 relative shrink-0">
                      <img 
                        src={PRAYER_IMAGE} 
                        className={`w-full h-full object-cover transition-all duration-1000 ${isRecording ? 'animate-pulse scale-110' : 'opacity-50 grayscale'}`} 
                        alt="Praying" 
                      />
                    </div>
                    <div className="w-full space-y-6 flex flex-col items-center">
                      <p className="text-red-800/80 font-serif-tc text-lg font-bold">{isRecording ? "正在傾聽您的祈禱..." : "請準備開口..."}</p>
                      <button onClick={handleFinishRecording} className="w-full bg-red-800 text-white py-6 rounded-2xl font-bold text-2xl shadow-lg hover:bg-red-900 transition-all active:scale-95">稟告完畢</button>
                      <button onClick={() => setInputMode('manual')} className="text-stone-400 text-sm flex items-center gap-2 hover:text-red-800 underline transition-colors"><Pencil size={14} /> 改用手寫輸入</button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-xl flex flex-col space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <input type="text" placeholder="姓名" className="w-full p-5 bg-stone-50 rounded-2xl border border-stone-200 text-lg outline-none focus:ring-2 focus:ring-red-500/20" value={userInfo.name} onChange={e => setUserInfo({...userInfo, name: e.target.value})} />
                      <input type="text" placeholder="生辰 (例如: 民國xx年x月x日)" className="w-full p-5 bg-stone-50 rounded-2xl border border-stone-200 text-lg outline-none focus:ring-2 focus:ring-red-500/20" value={userInfo.birthday} onChange={e => setUserInfo({...userInfo, birthday: e.target.value})} />
                    </div>
                    <textarea placeholder="請在此詳述欲請示 恩主公之事項..." className="w-full p-6 bg-stone-50 rounded-2xl border border-stone-200 h-48 text-lg outline-none focus:ring-2 focus:ring-red-500/20 resize-none font-serif-tc" value={userInfo.quest} onChange={e => setUserInfo({...userInfo, quest: e.target.value})} />
                    <button onClick={() => setStep('drawing')} className="w-full bg-red-800 text-white py-6 rounded-2xl font-bold text-2xl shadow-lg hover:bg-red-900 active:scale-95">確認完畢，開始求籤</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'drawing' && (
            <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in p-10">
              <div className="text-center space-y-4 mb-12">
                <h3 className="text-5xl font-serif-tc font-black text-red-900 tracking-[0.5em]">搖動籤筒</h3>
                <p className="text-stone-400 italic font-serif-tc text-xl">誠心祈求後，搖動籤筒抽取靈籤</p>
              </div>
              <div className="relative w-full max-w-xs aspect-square flex items-center justify-center">
                <div 
                  onMouseDown={startShaking} onTouchStart={startShaking}
                  onMouseUp={stopShaking} onTouchEnd={stopShaking}
                  className={`w-full h-full cursor-pointer flex items-center justify-center ${isShaking ? '' : 'animate-[wiggle_2s_infinite]'}`}
                >
                  <img src={TUBE_IMAGE} className={`h-full w-auto object-contain mix-blend-multiply transition-all ${isShaking ? 'animate-[shake_0.1s_infinite] scale-110 drop-shadow-2xl' : 'hover:scale-105'}`} alt="籤筒" />
                </div>
              </div>
              <div className="mt-12 text-stone-400 text-lg animate-pulse font-serif-tc">
                {isShaking ? "正在感應靈籤中..." : "滑鼠按住籤筒開始搖動，放開即得籤"}
              </div>
            </div>
          )}

          {step === 'draw_result' && currentPoem && (
            <div className="flex-1 flex flex-col items-center justify-center p-10 md:p-20 space-y-12 animate-in slide-in-from-right">
              <div className="text-center space-y-6">
                <p className="text-stone-500 font-serif-tc text-2xl tracking-widest uppercase">抽中靈籤</p>
                <div className="w-64 h-1.5 bg-red-800/20 mx-auto rounded-full"></div>
                <h3 className="text-7xl md:text-9xl font-black text-red-900 font-serif-tc tracking-[0.4em] my-6">{currentPoem.title}</h3>
                <div className="w-64 h-1.5 bg-red-800/20 mx-auto rounded-full"></div>
              </div>
              <p className="text-stone-600 font-serif-tc text-center text-xl leading-relaxed max-w-md">已抽取此籤，請向 恩主公<br/>賜筊確認是否為此靈籤。</p>
              <div className="mt-10 flex items-center gap-3 text-red-800 font-black text-3xl font-serif-tc">
                <span>即將進行擲筊</span>
                <span className="flex gap-1">
                  <span className="animate-bounce">.</span><span className="animate-bounce [animation-delay:0.2s]">.</span><span className="animate-bounce [animation-delay:0.4s]">.</span>
                </span>
              </div>
            </div>
          )}

          {step === 'bwei' && (
            <div className="flex-1 flex flex-col items-center justify-center p-10 animate-in slide-in-from-bottom">
              <div className="text-center space-y-3 mb-10">
                <h4 className="text-red-900 font-bold text-3xl font-serif-tc">【 {currentPoem?.title} 】</h4>
                <h3 className="text-4xl md:text-5xl font-serif-tc font-black text-stone-800 tracking-widest">擲筊請示</h3>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl">
                <div onClick={handleCastBwei} className="transform cursor-pointer hover:scale-[1.05] transition-transform active:scale-[0.95]">
                  <BweiVisual result={bweiResult} isAnimating={isBweiAnimating} />
                </div>
                
                <div className="mt-12 flex flex-col items-center space-y-10 w-full">
                  {bweiResult && !isBweiAnimating ? (
                    <div className="text-center space-y-4">
                      <div className="text-6xl md:text-8xl font-black font-serif-tc text-red-900 drop-shadow-xl animate-in zoom-in">
                        【 {bweiResult === 'sheng' ? '聖 筊' : bweiResult === 'xiao' ? '笑 筊' : '陰 筊'} 】
                      </div>
                      {bweiMessage && <p className="text-red-600 font-black text-2xl animate-pulse px-8 py-3 bg-red-50 rounded-full border border-red-100">{bweiMessage}</p>}
                    </div>
                  ) : (
                    <p className="text-stone-400 text-lg italic animate-pulse font-serif-tc">點擊筊杯開始擲筊，需連續獲三次聖筊</p>
                  )}

                  <div className="flex gap-10 py-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-700 ${shengCount >= i ? 'bg-green-600 border-green-200 text-white shadow-2xl scale-110' : 'bg-stone-50 border-stone-200 text-stone-300'}`}>
                        {shengCount >= i ? <Check size={40} strokeWidth={4} /> : <span className="text-2xl font-bold">{i}</span>}
                      </div>
                    ))}
                  </div>

                  <div className="h-24 flex items-center justify-center w-full">
                    {shengCount === 3 && !isBweiAnimating && (
                      <button onClick={() => setStep('result')} className="px-16 bg-green-700 text-white py-6 rounded-[2rem] font-bold text-2xl shadow-2xl animate-bounce hover:bg-green-800 transition-all">
                        領取籤詩
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'result' && currentPoem && (
            <div className="flex-1 flex flex-col md:flex-row animate-in fade-in duration-1000 p-8 md:p-16 gap-12">
              <div className="md:w-1/2 flex flex-col items-center justify-center p-10 bg-[#fffcf7] rounded-[3rem] shadow-xl border-4 border-red-900 relative">
                <div className="absolute inset-4 border border-red-800/10 rounded-[2.5rem] pointer-events-none"></div>
                <div className="text-center mb-10">
                  <h3 className="text-3xl font-black text-red-900 font-serif-tc tracking-widest mb-4">行天宮 雷雨師靈籤</h3>
                  <p className="text-2xl font-serif-tc text-red-800 font-bold">{currentPoem.title}</p>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-6 font-serif-tc">
                   {currentPoem.poem.split('\n').map((line, idx) => (
                     <p key={idx} className="text-3xl md:text-4xl font-black tracking-[0.4em] text-stone-800 text-center leading-relaxed drop-shadow-sm">{line}</p>
                   ))}
                </div>
              </div>
              <div className="md:w-1/2 flex flex-col space-y-10 py-4">
                <div className="flex-1 space-y-8 overflow-y-auto max-h-[450px] pr-4 scrollbar-hide">
                   <div className="space-y-3">
                      <p className="font-bold text-red-900 text-xl font-serif-tc tracking-widest flex items-center gap-3"><span className="w-3 h-3 bg-red-900 rounded-full"></span> 聖 意</p>
                      <p className="text-stone-700 font-serif-tc leading-relaxed text-xl pl-6">{currentPoem.advice}</p>
                   </div>
                   <div className="space-y-3">
                      <p className="font-bold text-red-900 text-xl font-serif-tc tracking-widest flex items-center gap-3"><span className="w-3 h-3 bg-red-900 rounded-full"></span> 解 說</p>
                      <p className="text-stone-700 font-serif-tc leading-relaxed text-xl pl-6">{currentPoem.explanation}</p>
                   </div>
                </div>
                <div className="space-y-4">
                  <button onClick={downloadImage} className="w-full bg-red-800 text-white py-6 rounded-2xl font-bold text-2xl flex items-center justify-center gap-4 shadow-xl hover:bg-red-900 transition-all active:scale-95"><Download size={28} /> 留存籤詩 (下載)</button>
                  <button onClick={() => setStep('welcome')} className="w-full py-4 text-stone-400 text-lg font-bold flex items-center justify-center gap-3 hover:text-red-800 transition-colors"><RotateCcw size={20} /> 再求一籤</button>
                </div>
              </div>
              <canvas ref={canvasRef} width="400" height="800" className="hidden"></canvas>
            </div>
          )}

          {step === 'history' && (
            <div className="flex-1 flex flex-col md:flex-row animate-in slide-in-from-right bg-white overflow-hidden min-h-[70vh]">
               <div className="md:w-1/3 bg-stone-50 p-12 flex flex-col items-center justify-center text-center space-y-10 border-r border-stone-100">
                  <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center shadow-inner">
                    <HandCoins size={96} className="text-yellow-600 animate-bounce" />
                  </div>
                  <h3 className="text-4xl font-black font-serif-tc text-red-900 tracking-widest">功德簿</h3>
                  <button onClick={() => setStep('welcome')} className="w-full bg-stone-800 text-white py-5 rounded-2xl font-bold text-xl hover:bg-black transition-colors">返回首頁</button>
              </div>
              <div className="md:w-2/3 p-10 md:p-16 overflow-y-auto max-h-[70vh] scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {history.length === 0 ? (
                    <div className="col-span-full py-40 text-center opacity-20 italic font-serif-tc text-3xl">尚無求籤紀錄</div>
                  ) : (
                    history.map(item => (
                      <div key={item.key} onClick={() => { setCurrentPoem(item); setStep('result'); }} className="p-8 bg-stone-50 rounded-[2rem] shadow-sm border-l-8 border-red-800 cursor-pointer hover:bg-stone-100 transition-all hover:scale-[1.03] group">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-black text-2xl text-red-900 font-serif-tc group-hover:underline">{item.title}</span>
                          <span className="text-[10px] text-stone-400 font-mono bg-white px-2 py-1 rounded-full">{item.timestamp}</span>
                        </div>
                        <p className="text-stone-500 font-serif-tc leading-relaxed line-clamp-2 italic text-lg">{item.poem.replace(/\n/g, ' ')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full py-12 text-center text-stone-400 text-lg font-serif-tc border-t border-stone-200 mt-10">
        <p>© 2025 行天宮線上求籤系統 · AI 輔助版</p>
        <p className="mt-3 text-stone-300">誠心祈求，指引迷津。本系統僅供參考。</p>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          25% { transform: translateX(-8px) rotate(-3deg); }
          75% { transform: translateX(8px) rotate(3deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@900&display=swap');
      `}</style>
    </div>
  );
};

export default App;
