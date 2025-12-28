
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Download, Loader2, Check, 
  RotateCcw, Pencil, HandCoins, ArrowRight
} from 'lucide-react';
import { Step, InputMode, BweiResult, Poem, UserInfo, DivinationRecord } from './types';
import { POEM_DATA } from './constants';
import { processTranscriptWithAI } from './services/gemini';
import BweiVisual from './components/BweiVisual';

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
    if (step === 'input' && inputMode === 'voice') {
      setIsRecording(true);
      setTempTranscript("");
    }
  }, [step, inputMode]);

  // Handle auto-transition from draw_result to bwei - 3 seconds
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
      const drawnPoem = getRandomPoem();
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
      const isMiracle = Math.random() < 0.001;
      
      if (isMiracle) {
        result = 'standing';
      } else if (sessionWillSucceed) {
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
      
      if (result === 'sheng' || result === 'standing') {
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
    ctx.font = '20px serif'; ctx.fillText(`${currentPoem.title} (${currentPoem.grade})`, 200, 125);
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

  const getRandomPoem = (): Poem => POEM_DATA[Math.floor(Math.random() * POEM_DATA.length)];

  return (
    <div className="min-h-screen bg-stone-200 text-stone-900 flex flex-col items-center p-4 select-none">
      <div className="max-w-md w-full bg-[#fdfaf5] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[850px] border-[10px] border-stone-800 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-stone-800 rounded-b-2xl z-50"></div>

        <div className="pt-10 pb-4 px-6 bg-red-900 text-white relative flex items-center justify-center shrink-0 z-40">
          <button onClick={() => setStep('welcome')} className="hover:opacity-80 transition-opacity">
            <h1 className="text-lg font-bold font-serif-tc tracking-widest">行天宮線上求籤</h1>
          </button>
          
          {step === 'result' && (
            <button 
              onClick={() => setStep('history')} 
              className="absolute right-6 flex flex-col items-center gap-0.5 hover:bg-white/10 p-1 px-3 rounded-xl transition-colors"
            >
              <HandCoins size={18} />
              <span className="text-[10px] font-serif-tc font-bold">添香油錢</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative flex flex-col">
          
          {step === 'welcome' && (
            <div className="h-full flex flex-col animate-in fade-in duration-700">
              <div className="flex-1 relative overflow-hidden">
                <img src={DEITY_IMAGE} className="w-full h-full object-cover object-top" alt="Guan Yu" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              <div className="p-8 space-y-6 bg-white rounded-t-[3rem] -mt-10 relative z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.1)]">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black text-red-900 font-serif-tc tracking-widest">恩主公靈籤</h2>
                  <p className="text-stone-500 text-sm font-serif-tc">誠心祈求，必有感應</p>
                </div>
                <button 
                  onClick={() => { setStep('input'); setInputMode('voice'); }} 
                  className="w-full bg-red-800 text-white py-5 rounded-2xl font-bold text-xl shadow-xl flex items-center justify-center active:scale-95 transition-all"
                >
                  向神明稟告所求何事
                </button>
              </div>
            </div>
          )}

          {step === 'input' && (
            <div className="h-full flex flex-col relative animate-in fade-in duration-500 bg-white">
              <div className="h-2/5 w-full relative overflow-hidden">
                <img src={DEITY_IMAGE} className="w-full h-full object-cover object-top" alt="Guan Yu" />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-start p-8 -mt-12 relative z-10 overflow-hidden space-y-4">
                <div className="text-center">
                  <h3 className="text-3xl font-serif-tc font-bold text-red-900 tracking-widest">恭敬稟告</h3>
                  <p className="text-stone-500 text-sm mt-1 font-serif-tc">請講姓名、出生年月日、跟要求的事情</p>
                </div>

                {inputMode === 'voice' ? (
                  <div className="w-full flex-1 flex flex-col items-center justify-between pb-12">
                    <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-sm relative shrink-0 my-4">
                      <img 
                        src={PRAYER_IMAGE} 
                        className={`w-full h-full object-cover transition-all duration-1000 mix-blend-multiply ${isRecording ? 'animate-pulse opacity-100 scale-105' : 'opacity-40 grayscale'}`} 
                        alt="Praying" 
                      />
                    </div>
                    
                    <div className="w-full space-y-8 flex flex-col items-center">
                      <button onClick={() => setInputMode('manual')} className="text-red-800/60 text-sm flex items-center justify-center gap-2 italic hover:text-red-800 transition-colors">
                        <Pencil size={14} /> 手寫稟告
                      </button>
                      <button onClick={handleFinishRecording} className="w-2/3 bg-red-800 text-white py-4 rounded-xl font-bold text-lg shadow-md active:scale-95 transition-all">
                        稟告完畢
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex-1 flex flex-col space-y-4 pt-4 pb-12">
                    <input type="text" placeholder="姓名" className="w-full p-4 bg-stone-100 rounded-xl outline-none focus:ring-1 focus:ring-red-500" value={userInfo.name} onChange={e => setUserInfo({...userInfo, name: e.target.value})} />
                    <input type="text" placeholder="生辰" className="w-full p-4 bg-stone-100 rounded-xl outline-none focus:ring-1 focus:ring-red-500" value={userInfo.birthday} onChange={e => setUserInfo({...userInfo, birthday: e.target.value})} />
                    <textarea placeholder="請示事由" className="w-full p-4 bg-stone-100 rounded-xl flex-1 outline-none focus:ring-1 focus:ring-red-500 resize-none" value={userInfo.quest} onChange={e => setUserInfo({...userInfo, quest: e.target.value})} />
                    <button onClick={() => setStep('drawing')} className="w-full bg-red-800 text-white py-5 rounded-2xl font-bold active:scale-95 transition-all">確認完畢，開始求籤</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'drawing' && (
            <div className="flex-1 flex flex-col animate-in zoom-in h-full">
              <div className="p-4 text-center space-y-1 shrink-0">
                <h3 className="text-3xl font-serif-tc font-black text-red-900 tracking-widest">籤筒</h3>
                <p className="text-stone-400 italic font-serif-tc text-base">請搖動籤筒抽籤</p>
              </div>

              <div className="flex-1 flex items-center justify-center px-4">
                <div 
                  onMouseDown={startShaking} onTouchStart={startShaking}
                  onMouseUp={stopShaking} onTouchEnd={stopShaking}
                  onMouseLeave={stopShaking}
                  className={`w-full h-full max-h-[80%] transition-transform cursor-pointer flex items-center justify-center animate-[wiggle_1.2s_infinite]`}
                >
                  <img 
                    src={TUBE_IMAGE} 
                    className={`h-full w-auto object-contain mix-blend-multiply ${isShaking ? 'animate-[shake_0.12s_infinite] scale-105' : ''}`} 
                    alt="籤筒" 
                  />
                </div>
              </div>
              
              <div className="p-6 text-center space-y-4 shrink-0">
                <div className="text-stone-400 text-xs animate-pulse font-serif-tc">長按籤筒以加速搖動，放開即得籤</div>
              </div>
            </div>
          )}

          {step === 'draw_result' && currentPoem && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12 animate-in slide-in-from-right">
              <div className="text-center space-y-4">
                <p className="text-stone-500 font-serif-tc text-lg tracking-widest">抽中靈籤</p>
                <div className="w-48 h-1 bg-red-800/20 mx-auto rounded-full"></div>
                <h3 className="text-5xl font-black text-red-900 font-serif-tc tracking-[0.5em]">{currentPoem.title}</h3>
                <div className="w-48 h-1 bg-red-800/20 mx-auto rounded-full"></div>
              </div>

              <div className="w-full flex flex-col items-center space-y-4">
                <p className="text-stone-600 font-serif-tc text-center leading-relaxed px-4">
                  已抽取此籤，請向 恩主公<br/>賜筊確認是否為此靈籤。
                </p>
                <div className="mt-8 flex items-center gap-1 text-red-800 font-black text-xl font-serif-tc">
                  <span>即將進入擲筊確認</span>
                  <span className="flex">
                    <span className="animate-[pulse_1s_infinite_0ms]">.</span>
                    <span className="animate-[pulse_1s_infinite_200ms]">.</span>
                    <span className="animate-[pulse_1s_infinite_400ms]">.</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 'bwei' && (
            <div className="p-8 flex flex-col items-center justify-center min-h-full animate-in slide-in-from-bottom duration-700">
              <div className="text-center mb-2 shrink-0">
                <h4 className="text-red-900 font-bold text-xl font-serif-tc">【 {currentPoem?.title} 】</h4>
                <h3 className="text-2xl font-serif-tc font-black text-stone-800 tracking-widest">請擲筊確認</h3>
                <p className="text-stone-400 text-xs font-serif-tc mt-1 h-4">需連續獲得三次聖筊確認此籤</p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center w-full">
                  <div onClick={handleCastBwei} className="transform cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]">
                    <BweiVisual result={bweiResult} isAnimating={isBweiAnimating} />
                  </div>
                  <div className="mt-4 text-stone-300 text-xs italic text-center animate-pulse font-serif-tc h-4">
                    {!bweiResult && !isBweiAnimating && "點擊筊杯，請示 恩主公"}
                  </div>

                  {bweiResult && !isBweiAnimating && (
                    <div className="mt-6 flex flex-col items-center space-y-4">
                      <div className="text-5xl font-black font-serif-tc text-red-900 drop-shadow-md">
                        【 {
                          bweiResult === 'sheng' ? '聖 筊' : 
                          bweiResult === 'standing' ? '立 筊' : 
                          bweiResult === 'xiao' ? '笑 筊' : '陰 筊'
                        } 】
                      </div>
                      {bweiMessage && (
                        <p className="text-red-600 font-black animate-pulse text-xl bg-red-50 px-6 py-2 rounded-full border border-red-100">{bweiMessage}</p>
                      )}
                    </div>
                  )}

                  {/* Move checkmarks here to be between the toss result and the button */}
                  <div className="flex gap-4 py-8">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${shengCount >= i ? 'bg-green-600 border-green-200 text-white shadow-md' : 'bg-stone-50 border-stone-200 text-stone-300 shadow-inner'}`}>
                        {shengCount >= i ? <Check size={20} strokeWidth={3} /> : <span className="text-xs font-bold">{i}</span>}
                      </div>
                    ))}
                  </div>
              </div>

              <div className="w-full shrink-0 flex justify-center pb-8">
                {shengCount === 3 && !isBweiAnimating ? (
                  <button onClick={() => setStep('result')} className="px-10 bg-green-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg animate-bounce hover:bg-green-800 transition-colors">
                    領取籤詩
                  </button>
                ) : (
                  <div className="h-[60px]"></div>
                )}
              </div>
            </div>
          )}

          {step === 'result' && currentPoem && (
            <div className="p-4 flex-1 flex flex-col animate-in fade-in duration-1000">
              <div className="bg-white p-6 rounded-3xl shadow-xl flex-1 flex flex-col overflow-hidden border-t-[8px] border-red-800">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-black text-red-900 font-serif-tc">
                    {currentPoem.title}（{currentPoem.grade}）
                  </h3>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center gap-2 my-1 font-serif-tc">
                   {currentPoem.poem.split('\n').map((line, idx) => (
                     <p key={idx} className="text-xl font-black tracking-[0.2em] text-stone-800 text-center leading-relaxed">{line}</p>
                   ))}
                </div>

                <div className="space-y-4 pt-4 border-t border-stone-100">
                   <div>
                      <p className="font-bold text-red-800 mb-1 text-sm font-serif-tc tracking-widest uppercase">【 聖 意 】</p>
                      <p className="text-stone-700 font-serif-tc leading-relaxed text-sm">{currentPoem.advice}</p>
                   </div>
                   <div>
                      <p className="font-bold text-red-800 mb-1 text-sm font-serif-tc tracking-widest uppercase">【 解 說 】</p>
                      <p className="text-stone-700 font-serif-tc leading-relaxed text-sm">{currentPoem.explanation}</p>
                   </div>
                </div>
              </div>

              <div className="p-6 space-y-4 pb-12">
                <button onClick={downloadImage} className="w-full bg-red-800 text-white py-5 rounded-2xl font-bold text-xl flex items-center justify-center active:scale-95 transition-all shadow-lg hover:bg-red-900">
                    留存籤詩
                </button>
                <button onClick={() => { setStep('welcome'); setShengCount(0); }} className="w-full py-2 text-stone-400 text-sm font-bold flex items-center justify-center gap-2 hover:text-red-800 transition-colors">
                    再求一籤
                </button>
              </div>
              <canvas ref={canvasRef} width="400" height="800" className="hidden"></canvas>
            </div>
          )}

          {step === 'history' && (
            <div className="p-8 h-full flex flex-col space-y-6 bg-white">
              <h3 className="text-2xl font-black font-serif-tc text-red-900 tracking-widest flex items-center gap-2">
                <HandCoins className="text-yellow-600" /> 添香油錢
              </h3>
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="w-32 h-32 bg-stone-50 rounded-full flex items-center justify-center">
                  <HandCoins size={64} className="text-yellow-600 animate-bounce" />
                </div>
                <div className="space-y-2">
                  <p className="font-serif-tc text-lg font-bold text-stone-800">隨喜功德 廣結善緣</p>
                  <p className="font-serif-tc text-sm text-stone-500 leading-relaxed px-6">弟子誠心向善，恩主公必有感應。<br/>此頁面為歷史求籤紀錄(功德簿)。</p>
                </div>
                <div className="w-full overflow-y-auto max-h-[300px] space-y-4 pr-2 scrollbar-hide">
                  {history.length === 0 ? <p className="opacity-30 italic font-serif-tc py-10">尚未有紀錄</p> : history.map(item => (
                    <div key={item.key} onClick={() => { setCurrentPoem(item); setStep('result'); }} className="p-4 bg-stone-50 rounded-2xl shadow-sm border-l-4 border-red-800 cursor-pointer text-left hover:bg-stone-100 transition-colors">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-red-900 font-serif-tc">{item.title}</span>
                        <span className="text-[9px] text-stone-400 font-mono">{item.timestamp}</span>
                      </div>
                      <p className="text-xs text-stone-500 truncate font-serif-tc italic">{item.poem.replace(/\n/g, ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setStep('welcome')} className="w-full bg-red-800 text-white py-4 rounded-xl font-bold">返回首頁</button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          25% { transform: translateX(-4px) rotate(-1deg); }
          75% { transform: translateX(4px) rotate(1deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-1.5deg) scale(1); }
          50% { transform: rotate(1.5deg) scale(0.98); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
