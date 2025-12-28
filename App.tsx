
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
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col items-center select-none font-sans overflow-x-hidden">
      {/* Website Header */}
      <header className="w-full bg-red-900 text-white py-4 px-6 shadow-lg flex items-center justify-between sticky top-0 z-50">
        <div className="flex-1"></div>
        <button onClick={() => setStep('welcome')} className="hover:opacity-80 transition-opacity">
          <h1 className="text-xl md:text-2xl font-bold font-serif-tc tracking-widest">行天宮線上求籤</h1>
        </button>
        <div className="flex-1 flex justify-end">
          {step === 'result' && (
            <button 
              onClick={() => setStep('history')} 
              className="flex flex-col items-center gap-0.5 hover:bg-white/10 p-1 px-3 rounded-xl transition-colors"
            >
              <HandCoins size={20} />
              <span className="text-[10px] font-serif-tc font-bold">添香油錢</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Responsive Content Area */}
      <main className="w-full max-w-4xl flex-1 flex flex-col py-6 md:py-10 px-4 md:px-0">
        <div className="bg-[#fdfaf5] rounded-3xl shadow-xl overflow-hidden flex flex-col min-h-[70vh] border border-stone-200 relative transition-all duration-500">
          
          {/* WELCOME */}
          {step === 'welcome' && (
            <div className="flex-1 flex flex-col md:flex-row animate-in fade-in duration-700">
              <div className="md:w-1/2 relative h-64 md:h-auto overflow-hidden">
                <img src={DEITY_IMAGE} className="w-full h-full object-cover object-top" alt="Guan Yu" />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/30 to-transparent"></div>
              </div>
              <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center space-y-8">
                <div className="text-center md:text-left space-y-4">
                  <h2 className="text-4xl md:text-5xl font-black text-red-900 font-serif-tc tracking-widest">恩主公靈籤</h2>
                  <p className="text-stone-500 text-lg font-serif-tc leading-relaxed">誠心祈求，必有感應。在此向 恩主公稟告您的心願，指引迷津。</p>
                </div>
                <button 
                  onClick={() => { setStep('input'); setInputMode('voice'); }} 
                  className="w-full bg-red-800 text-white py-6 rounded-2xl font-bold text-xl shadow-xl hover:bg-red-900 active:scale-95 transition-all flex items-center justify-center gap-3 group"
                >
                  開始稟告 <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* INPUT */}
          {step === 'input' && (
            <div className="flex-1 flex flex-col md:flex-row animate-in fade-in duration-500 bg-white">
              <div className="md:w-1/3 h-48 md:h-auto relative overflow-hidden">
                <img src={DEITY_IMAGE} className="w-full h-full object-cover object-top" alt="Guan Yu" />
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-white via-transparent to-transparent"></div>
              </div>
              
              <div className="md:w-2/3 p-8 md:p-16 flex flex-col items-center justify-center space-y-8">
                <div className="text-center space-y-2">
                  <h3 className="text-3xl md:text-4xl font-serif-tc font-bold text-red-900 tracking-widest">恭敬稟告</h3>
                  <p className="text-stone-500 text-base font-serif-tc">請講述您的姓名、生辰，以及欲請示之事項。</p>
                </div>

                {inputMode === 'voice' ? (
                  <div className="w-full max-w-md flex flex-col items-center space-y-10">
                    <div className="w-32 h-32 rounded-3xl overflow-hidden shadow-md relative shrink-0">
                      <img 
                        src={PRAYER_IMAGE} 
                        className={`w-full h-full object-cover transition-all duration-1000 mix-blend-multiply ${isRecording ? 'animate-pulse opacity-100 scale-105' : 'opacity-40 grayscale'}`} 
                        alt="Praying" 
                      />
                    </div>
                    
                    <div className="w-full space-y-6 flex flex-col items-center">
                      <div className="text-red-800/80 font-serif-tc text-center">
                        {isRecording ? "正在傾聽您的祈禱..." : "準備中..."}
                      </div>
                      <button onClick={handleFinishRecording} className="w-full bg-red-800 text-white py-5 rounded-2xl font-bold text-xl shadow-lg hover:bg-red-900 active:scale-95 transition-all">
                        稟告完畢
                      </button>
                      <button onClick={() => setInputMode('manual')} className="text-stone-400 text-sm flex items-center gap-2 hover:text-red-800 transition-colors">
                        <Pencil size={14} /> 改用手寫輸入
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-lg flex flex-col space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input type="text" placeholder="姓名" className="w-full p-4 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-red-500/20" value={userInfo.name} onChange={e => setUserInfo({...userInfo, name: e.target.value})} />
                      <input type="text" placeholder="生辰 (例如: 民國xx年x月x日)" className="w-full p-4 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:ring-2 focus:ring-red-500/20" value={userInfo.birthday} onChange={e => setUserInfo({...userInfo, birthday: e.target.value})} />
                    </div>
                    <textarea placeholder="請在此詳述欲請示 恩主公之事項..." className="w-full p-4 bg-stone-50 rounded-xl border border-stone-200 h-40 outline-none focus:ring-2 focus:ring-red-500/20 resize-none font-serif-tc" value={userInfo.quest} onChange={e => setUserInfo({...userInfo, quest: e.target.value})} />
                    <button onClick={() => setStep('drawing')} className="w-full bg-red-800 text-white py-5 rounded-2xl font-bold text-xl shadow-lg hover:bg-red-900 active:scale-95 transition-all">確認完畢，開始求籤</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DRAWING */}
          {step === 'drawing' && (
            <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in duration-500 p-8">
              <div className="text-center space-y-2 mb-10">
                <h3 className="text-4xl font-serif-tc font-black text-red-900 tracking-widest">搖動籤筒</h3>
                <p className="text-stone-400 italic font-serif-tc text-lg">誠心祈求後，搖動籤筒抽取靈籤</p>
              </div>

              <div className="relative w-full max-w-xs md:max-w-sm aspect-square flex items-center justify-center">
                <div 
                  onMouseDown={startShaking} onTouchStart={startShaking}
                  onMouseUp={stopShaking} onTouchEnd={stopShaking}
                  onMouseLeave={stopShaking}
                  className={`w-full h-full transition-transform cursor-pointer flex items-center justify-center ${isShaking ? '' : 'animate-[wiggle_2s_infinite]'}`}
                >
                  <img 
                    src={TUBE_IMAGE} 
                    className={`h-full w-auto object-contain mix-blend-multiply transition-all ${isShaking ? 'animate-[shake_0.1s_infinite] scale-110 drop-shadow-2xl' : 'hover:scale-105'}`} 
                    alt="籤筒" 
                  />
                </div>
              </div>
              
              <div className="mt-12 text-center space-y-4">
                <div className="text-stone-400 text-sm animate-pulse font-serif-tc">
                  {isShaking ? "正在感應靈籤中..." : "長按/滑鼠按住籤筒開始搖動，放開即得籤"}
                </div>
              </div>
            </div>
          )}

          {/* DRAW RESULT */}
          {step === 'draw_result' && currentPoem && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-16 space-y-12 animate-in slide-in-from-right duration-700">
              <div className="text-center space-y-6">
                <p className="text-stone-500 font-serif-tc text-xl tracking-widest">抽中靈籤</p>
                <div className="w-64 h-1 bg-red-800/20 mx-auto rounded-full"></div>
                <h3 className="text-6xl md:text-8xl font-black text-red-900 font-serif-tc tracking-[0.5em] my-4">{currentPoem.title}</h3>
                <div className="w-64 h-1 bg-red-800/20 mx-auto rounded-full"></div>
              </div>

              <div className="w-full max-w-md flex flex-col items-center space-y-6">
                <p className="text-stone-600 font-serif-tc text-center text-lg leading-relaxed">
                  已抽取此籤，請向 恩主公<br/>賜筊確認是否為此靈籤。
                </p>
                <div className="mt-8 flex items-center gap-2 text-red-800 font-black text-2xl font-serif-tc">
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

          {/* BWEI */}
          {step === 'bwei' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in slide-in-from-bottom duration-700">
              <div className="text-center space-y-3 mb-8">
                <h4 className="text-red-900 font-bold text-2xl font-serif-tc">【 {currentPoem?.title} 】</h4>
                <h3 className="text-3xl md:text-4xl font-serif-tc font-black text-stone-800 tracking-widest">擲筊請示</h3>
                <p className="text-stone-500 font-serif-tc text-base">需連續獲得三次聖筊確認此籤</p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl">
                  <div onClick={handleCastBwei} className="transform cursor-pointer hover:scale-[1.05] transition-transform active:scale-[0.95]">
                    <BweiVisual result={bweiResult} isAnimating={isBweiAnimating} />
                  </div>
                  
                  <div className="mt-6 text-stone-400 text-sm italic text-center animate-pulse font-serif-tc h-6">
                    {!bweiResult && !isBweiAnimating && "點擊筊杯，誠心向 恩主公請示"}
                  </div>

                  {bweiResult && !isBweiAnimating && (
                    <div className="mt-10 flex flex-col items-center space-y-6">
                      <div className="text-6xl md:text-7xl font-black font-serif-tc text-red-900 drop-shadow-lg">
                        【 {
                          bweiResult === 'sheng' ? '聖 筊' : 
                          bweiResult === 'standing' ? '立 筊' : 
                          bweiResult === 'xiao' ? '笑 筊' : '陰 筊'
                        } 】
                      </div>
                      {bweiMessage && (
                        <p className="text-red-600 font-black animate-pulse text-2xl bg-red-50 px-8 py-3 rounded-full border border-red-100 shadow-sm">{bweiMessage}</p>
                      )}
                    </div>
                  )}

                  {/* Progress Checkmarks Between Result and Button */}
                  <div className="flex gap-6 py-10">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${shengCount >= i ? 'bg-green-600 border-green-200 text-white shadow-lg scale-110' : 'bg-stone-50 border-stone-200 text-stone-300 shadow-inner'}`}>
                        {shengCount >= i ? <Check size={32} strokeWidth={3} /> : <span className="text-lg font-bold">{i}</span>}
                      </div>
                    ))}
                  </div>
              </div>

              <div className="w-full max-w-xs flex justify-center pb-10">
                {shengCount === 3 && !isBweiAnimating ? (
                  <button onClick={() => setStep('result')} className="w-full bg-green-700 text-white py-5 rounded-2xl font-bold text-xl shadow-xl animate-bounce hover:bg-green-800 transition-colors">
                    領取籤詩
                  </button>
                ) : (
                  <div className="h-[68px]"></div>
                )}
              </div>
            </div>
          )}

          {/* RESULT */}
          {step === 'result' && currentPoem && (
            <div className="flex-1 flex flex-col md:flex-row animate-in fade-in duration-1000 p-6 md:p-12 gap-8 bg-white">
              <div className="md:w-1/2 flex flex-col items-center justify-center p-8 bg-[#fffcf7] rounded-3xl shadow-lg border-2 border-red-800 relative">
                <div className="absolute top-4 left-4 right-4 bottom-4 border border-red-800/20 pointer-events-none rounded-2xl"></div>
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-black text-red-900 font-serif-tc tracking-widest">
                    行天宮 雷雨師靈籤
                  </h3>
                  <p className="text-lg font-serif-tc text-red-800 mt-2">{currentPoem.title}（{currentPoem.grade}）</p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center gap-4 font-serif-tc">
                   {currentPoem.poem.split('\n').map((line, idx) => (
                     <p key={idx} className="text-2xl md:text-3xl font-black tracking-[0.3em] text-stone-800 text-center leading-relaxed drop-shadow-sm">{line}</p>
                   ))}
                </div>
              </div>

              <div className="md:w-1/2 flex flex-col space-y-8 py-4">
                <div className="flex-1 space-y-6 overflow-y-auto max-h-[400px] pr-4 scrollbar-hide">
                   <div className="space-y-2">
                      <p className="font-bold text-red-800 text-lg font-serif-tc tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-800 rounded-full"></span> 聖 意
                      </p>
                      <p className="text-stone-700 font-serif-tc leading-relaxed text-lg pl-4">{currentPoem.advice}</p>
                   </div>
                   <div className="space-y-2">
                      <p className="font-bold text-red-800 text-lg font-serif-tc tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-800 rounded-full"></span> 解 說
                      </p>
                      <p className="text-stone-700 font-serif-tc leading-relaxed text-lg pl-4">{currentPoem.explanation}</p>
                   </div>
                </div>

                <div className="space-y-4">
                  <button onClick={downloadImage} className="w-full bg-red-800 text-white py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 shadow-lg hover:bg-red-900 active:scale-95 transition-all">
                    <Download size={24} /> 留存籤詩 (下載)
                  </button>
                  <button onClick={() => { setStep('welcome'); setShengCount(0); }} className="w-full py-3 text-stone-400 text-base font-bold flex items-center justify-center gap-2 hover:text-red-800 transition-colors">
                    <RotateCcw size={18} /> 再求一籤
                  </button>
                </div>
              </div>
              <canvas ref={canvasRef} width="400" height="800" className="hidden"></canvas>
            </div>
          )}

          {/* HISTORY (Donation / Archives) */}
          {step === 'history' && (
            <div className="flex-1 flex flex-col md:flex-row animate-in slide-in-from-right bg-white overflow-hidden">
               <div className="md:w-1/3 bg-stone-50 p-12 flex flex-col items-center justify-center text-center space-y-8 border-b md:border-b-0 md:border-r border-stone-100">
                  <div className="w-40 h-40 bg-white rounded-full flex items-center justify-center shadow-inner relative">
                    <HandCoins size={80} className="text-yellow-600 animate-bounce" />
                    <div className="absolute inset-0 border-4 border-yellow-100 rounded-full animate-ping opacity-20"></div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-3xl font-black font-serif-tc text-red-900 tracking-widest">功德簿</h3>
                    <p className="font-serif-tc text-stone-500 leading-relaxed text-lg">
                      隨喜功德，廣結善緣。<br/>在此回顧過往抽得之靈籤。
                    </p>
                  </div>
                  <button onClick={() => setStep('welcome')} className="w-full bg-stone-800 text-white py-4 rounded-xl font-bold hover:bg-black transition-colors">返回首頁</button>
              </div>

              <div className="md:w-2/3 p-8 md:p-12 overflow-y-auto max-h-[70vh] scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {history.length === 0 ? (
                    <div className="col-span-full py-20 text-center opacity-30 italic font-serif-tc text-2xl">目前尚無求籤紀錄</div>
                  ) : (
                    history.map(item => (
                      <div key={item.key} onClick={() => { setCurrentPoem(item); setStep('result'); }} className="p-6 bg-stone-50 rounded-2xl shadow-sm border-l-8 border-red-800 cursor-pointer text-left hover:bg-stone-100 transition-all hover:scale-[1.02] group">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-black text-xl text-red-900 font-serif-tc group-hover:underline">{item.title}</span>
                          <span className="text-[10px] text-stone-400 font-mono bg-white px-2 py-1 rounded-full">{item.timestamp}</span>
                        </div>
                        <p className="text-stone-500 font-serif-tc leading-relaxed line-clamp-2 italic">{item.poem.replace(/\n/g, ' ')}</p>
                        <div className="mt-4 flex items-center justify-end text-red-800 font-bold text-sm">
                          查看詳解 <ArrowRight size={14} className="ml-1" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Website Footer Info */}
      <footer className="w-full py-8 text-center text-stone-400 text-sm font-serif-tc border-t border-stone-200 mt-10">
        <p>© 2025 行天宮線上求籤系統 · AI 輔助版</p>
        <p className="mt-2 text-stone-300">本系統僅供參考，誠心為要，信而不迷</p>
      </footer>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          25% { transform: translateX(-6px) rotate(-2deg); }
          75% { transform: translateX(6px) rotate(2deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-2deg) scale(1); }
          50% { transform: rotate(2deg) scale(0.99); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Specific fonts for browsers without system support */
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@900&display=swap');
      `}</style>
    </div>
  );
};

export default App;
