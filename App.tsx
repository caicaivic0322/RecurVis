
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Trash2, 
  Settings, 
  Terminal, 
  Cpu, 
  Layers, 
  Maximize2,
  ZoomIn,
  ZoomOut,
  Calculator,
  GitBranch,
  Type,
  Zap,
  GripVertical,
  Play,
  FastForward,
  SkipForward,
  RotateCcw
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { RecursiveFrame, MemoryBlock, LogEntry, StackFrame, AlgorithmType, HistorySnapshot } from './types';
import { CODE_SNIPPETS, INITIAL_MEMORY_SIZE } from './constants';

// --- Utility Components ---

const PanelHeader = ({ icon: Icon, title, extra }: { icon: any, title: string, extra?: React.ReactNode }) => (
  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-10 select-none">
    <div className="flex items-center gap-2 text-gray-700 font-semibold text-sm tracking-wide">
      <div className="w-1 h-4 bg-brand-500 rounded-full"></div>
      <Icon className="w-4 h-4 text-gray-500" />
      <span>{title}</span>
    </div>
    {extra}
  </div>
);

const Button = ({ onClick, disabled, children, variant = 'primary', className = '' }: any) => {
  const baseStyle = "flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none";
  const variants = {
    primary: "bg-white border border-gray-200 text-gray-700 hover:border-brand-500 hover:text-brand-600 shadow-sm",
    filled: "bg-brand-500 text-white hover:bg-brand-600 shadow-sm",
    ghost: "text-gray-500 hover:bg-gray-100",
    danger: "bg-white border border-gray-200 text-red-600 hover:border-red-500 hover:bg-red-50 shadow-sm"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`}>
      {children}
    </button>
  );
};

// --- Recursive Tree Visualizer ---

const TreeNode = ({ 
  frameId, 
  frames, 
  isRoot = false 
}: { 
  frameId: string, 
  frames: RecursiveFrame[], 
  isRoot?: boolean 
}) => {
  const frame = frames.find(f => f.id === frameId);
  if (!frame) return null;

  const isActive = frame.status === 'active';
  const isCompleted = frame.status === 'completed';
  const isReturning = frame.status === 'returning';

  return (
    <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* The Node Card - Compact Version */}
      <div className={`
        relative flex flex-col items-center justify-center 
        w-24 min-h-[3.5rem] p-1.5 rounded-lg border shadow-sm transition-all duration-300 bg-white z-10
        ${isActive ? 'border-brand-500 ring-2 ring-brand-100 scale-105 shadow-md' : ''}
        ${isCompleted ? 'border-green-500/50 bg-green-50/30' : ''}
        ${isReturning ? 'border-blue-400 bg-blue-50' : ''}
        ${!isActive && !isCompleted && !isReturning ? 'border-gray-200' : ''}
      `}>
        {/* Name Badge */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1.5 border border-gray-100 rounded-full shadow-sm z-20">
             <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap leading-none block py-0.5">
                {frame.name}
            </span>
        </div>

        {/* Content */}
        <div className="flex flex-col items-center justify-center gap-0.5 mt-1 w-full overflow-hidden">
            {/* Args */}
            <div className={`font-mono text-center truncate w-full transition-all ${frame.returnValue ? 'text-[9px] text-gray-400' : 'text-xs font-bold text-gray-700'}`}>
                {frame.args}
            </div>

            {/* Calculation Note */}
            {frame.note && (
                <div className="text-[8px] font-medium text-blue-600 bg-blue-50 px-1 rounded animate-pulse whitespace-nowrap max-w-full truncate">
                    {frame.note}
                </div>
            )}

            {/* Return Value */}
            {frame.returnValue && (
                <div className="text-xs font-mono font-bold text-green-600 bg-green-50 px-1.5 rounded border border-green-100 animate-in zoom-in">
                    Ret: {frame.returnValue}
                </div>
            )}
        </div>
        
        {/* Depth Badge */}
        <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-[8px] font-mono text-gray-400 z-20">
            {frame.depth}
        </div>
      </div>

      {/* Children & Connectors */}
      {frame.children.length > 0 && (
        <div className="flex flex-col items-center">
            {/* Vertical Line */}
            <div className="w-px h-3 bg-gray-300"></div>
            
            {/* Horizontal Connector for multiple children */}
            {frame.children.length > 1 && (
               <div className="w-[calc(100%-0.5rem)] h-px bg-gray-300 mb-3 relative top-[-1px]"></div>
            )}

            {/* Children Container - Tight Gap */}
            <div className="flex items-start gap-1 lg:gap-3">
                {frame.children.map((childId) => (
                    <div key={childId} className="flex flex-col items-center relative">
                        {/* Connecting line to child */}
                        {frame.children.length > 1 && <div className="absolute -top-3 w-px h-3 bg-gray-300"></div>}
                        <TreeNode frameId={childId} frames={frames} />
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  // -- UI State --
  const [inputN, setInputN] = useState<string>('5'); 
  const [inputStr, setInputStr] = useState<string>('level');
  const [selectedAlgo, setSelectedAlgo] = useState<AlgorithmType>(AlgorithmType.FACTORIAL);
  const [zoom, setZoom] = useState(1);
  
  // -- Execution State (Displayed) --
  const [frames, setFrames] = useState<RecursiveFrame[]>([]);
  const [rootId, setRootId] = useState<string | null>(null);
  const [memory, setMemory] = useState<MemoryBlock[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stack, setStack] = useState<StackFrame[]>([]);
  const [activeLine, setActiveLine] = useState<number>(-1);
  
  // -- Player State --
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [speed, setSpeed] = useState(1); // 1 = Normal, 2 = Fast, 5 = Very Fast, 99 = Instant
  
  // -- Refs for Logic (Mutable during recursion source of truth) --
  // We use refs so we can record snapshots synchronously without waiting for React renders
  const historyRef = useRef<HistorySnapshot[]>([]);
  const framesRef = useRef<RecursiveFrame[]>([]);
  const memoryRef = useRef<MemoryBlock[]>([]);
  const stackRef = useRef<StackFrame[]>([]);
  const logsRef = useRef<LogEntry[]>([]);
  const rootIdRef = useRef<string | null>(null);
  const speedRef = useRef(1);
  
  // -- Resizing State --
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(384);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const appContainerRef = useRef<HTMLDivElement>(null);

  // -- Initialization --
  const initMemory = () => {
    const initialMem: MemoryBlock[] = Array.from({ length: INITIAL_MEMORY_SIZE }, (_, i) => ({
      address: `0x${(i * 4 + 1000).toString(16).toUpperCase()}`,
      isOccupied: false,
      value: '',
      depth: -1
    }));
    setMemory(initialMem);
    memoryRef.current = initialMem;
  };

  useEffect(() => {
    initMemory();
    addLog('递归引擎就绪。', 'system');
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // -- Helper Functions --

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const entry: LogEntry = {
      id: uuidv4(),
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      message,
      type
    };
    // If not processing, update state directly. If processing, it's handled via refs/snapshots.
    if (!isProcessing) {
        setLogs(prev => [...prev, entry]);
    }
    logsRef.current = [...logsRef.current, entry];
  };

  // Stack-based allocation logic: Index = Depth - 1
  const allocateStackMemory = (depth: number, frameId: string, value: string) => {
    const newMem = [...memoryRef.current];
    const idx = depth - 1; 
    if (idx >= 0 && idx < newMem.length) {
        newMem[idx] = { 
            ...newMem[idx], 
            isOccupied: true, 
            frameId, 
            value,
            depth 
        };
    }
    memoryRef.current = newMem;
  };

  const freeStackMemory = (depth: number) => {
    const newMem = [...memoryRef.current];
    const idx = depth - 1;
    if (idx >= 0 && idx < newMem.length) {
        newMem[idx] = { 
            ...newMem[idx], 
            isOccupied: false, 
            frameId: undefined, 
            value: '',
            depth: -1
        };
    }
    memoryRef.current = newMem;
  };

  const resetEngine = () => {
      setIsProcessing(false);
      setFrames([]);
      setRootId(null);
      initMemory();
      setStack([]);
      setActiveLine(-1);
      setLogs(prev => [...prev, { id: uuidv4(), timestamp: new Date().toLocaleTimeString('zh-CN'), message: '可视化已重置。', type: 'system' }]);
      setCurrentStep(0);
      setTotalSteps(0);
      historyRef.current = [];
      
      // Reset Refs
      framesRef.current = [];
      rootIdRef.current = null;
      stackRef.current = [];
      logsRef.current = [];
  };

  // --- Snapshot Engine ---

  const commitStep = async (lineIdx: number, delayMs: number = 500) => {
      // 1. Save Snapshot
      const snapshot: HistorySnapshot = {
          frames: JSON.parse(JSON.stringify(framesRef.current)),
          memory: JSON.parse(JSON.stringify(memoryRef.current)),
          stack: JSON.parse(JSON.stringify(stackRef.current)),
          logs: JSON.parse(JSON.stringify(logsRef.current)),
          activeLine: lineIdx,
          rootId: rootIdRef.current
      };
      
      historyRef.current.push(snapshot);
      const stepIndex = historyRef.current.length - 1;
      setTotalSteps(historyRef.current.length);
      setCurrentStep(stepIndex);

      // 2. Update UI (Visual Feedback during run)
      setFrames(snapshot.frames);
      setMemory(snapshot.memory);
      setStack(snapshot.stack);
      setLogs(snapshot.logs);
      setActiveLine(lineIdx);
      setRootId(snapshot.rootId);

      // 3. Wait (Speed controlled)
      const currentSpeed = speedRef.current;
      if (currentSpeed >= 99) return; // Instant mode
      await new Promise(resolve => setTimeout(resolve, delayMs / currentSpeed));
  };

  const jumpToStep = (stepIndex: number) => {
      if (stepIndex < 0 || stepIndex >= historyRef.current.length) return;
      const snapshot = historyRef.current[stepIndex];
      
      setFrames(snapshot.frames);
      setMemory(snapshot.memory);
      setStack(snapshot.stack);
      setLogs(snapshot.logs);
      setActiveLine(snapshot.activeLine);
      setRootId(snapshot.rootId);
      setCurrentStep(stepIndex);
  };

  // --- Logic Helpers ---

  const createFrameRef = (name: string, args: string, parentId: string | null, depth: number) => {
      const id = uuidv4();
      const newFrame: RecursiveFrame = {
          id, name, args, children: [], status: 'active', depth
      };

      // Add to frames list
      framesRef.current = [...framesRef.current, newFrame];
      
      // Update parent's children
      if (parentId) {
          framesRef.current = framesRef.current.map(f => 
              f.id === parentId ? { ...f, children: [...f.children, id] } : f
          );
      } else {
          rootIdRef.current = id;
      }
      
      allocateStackMemory(depth, id, name);
      return id;
  };

  const updateFrameRef = (id: string, updates: Partial<RecursiveFrame>) => {
      framesRef.current = framesRef.current.map(f => f.id === id ? { ...f, ...updates } : f);
  };

  // --- Algorithms (Ref-based for Recording) ---

  const handleFactorial = async () => {
    if (isProcessing) return;
    resetEngine();
    setIsProcessing(true);
    setSelectedAlgo(AlgorithmType.FACTORIAL);
    
    const n = Math.min(parseInt(inputN) || 5, 12); 
    addLog(`准备运行: Factorial(${n})`, 'system');

    const run = async (currentN: number, parentId: string | null, depth: number): Promise<number> => {
        // Push Stack
        stackRef.current = [...stackRef.current, { id: uuidv4(), functionName: 'factorial', args: { n: currentN }, line: 0, highlight: true }];
        await commitStep(0);

        // Create Frame
        const frameId = createFrameRef('fact', `n=${currentN}`, parentId, depth);
        await commitStep(0);

        // Base Case
        if (currentN <= 1) {
            addLog(`基准情形: n=${currentN} -> 返回 1`, 'info');
            updateFrameRef(frameId, { status: 'returning', returnValue: '1', note: 'Base Case' });
            await commitStep(2);
            
            updateFrameRef(frameId, { status: 'completed', note: undefined });
            freeStackMemory(depth);
            stackRef.current = stackRef.current.slice(0, -1);
            await commitStep(2);
            return 1;
        }

        // Recursive Step
        updateFrameRef(frameId, { status: 'pending' });
        await commitStep(6);
        const prevRes = await run(currentN - 1, frameId, depth + 1);

        // Return Calculation
        updateFrameRef(frameId, { status: 'active', note: `${currentN} * ${prevRes}` });
        addLog(`计算: ${currentN} * ${prevRes}`, 'system');
        await commitStep(7);

        const result = currentN * prevRes;
        
        updateFrameRef(frameId, { status: 'returning', returnValue: result.toString(), note: undefined });
        addLog(`返回: ${result}`, 'success');
        await commitStep(7);
        
        updateFrameRef(frameId, { status: 'completed' });
        freeStackMemory(depth);
        stackRef.current = stackRef.current.slice(0, -1);
        await commitStep(7);
        return result;
    };

    await run(n, null, 1);
    setIsProcessing(false);
  };

  const handleFibonacci = async () => {
    if (isProcessing) return;
    resetEngine();
    setIsProcessing(true);
    setSelectedAlgo(AlgorithmType.FIBONACCI);
    
    const n = Math.min(parseInt(inputN) || 4, 7);
    addLog(`准备运行: Fibonacci(${n})`, 'system');

    const run = async (currentN: number, parentId: string | null, depth: number): Promise<number> => {
        stackRef.current = [...stackRef.current, { id: uuidv4(), functionName: 'fib', args: { n: currentN }, line: 0 }];
        await commitStep(0);

        const frameId = createFrameRef('fib', `n=${currentN}`, parentId, depth);
        await commitStep(0);

        // Base Case
        if (currentN <= 1) {
             const res = currentN;
             addLog(`基准情形: n=${currentN} -> 返回 ${res}`, 'info');
             updateFrameRef(frameId, { status: 'returning', returnValue: res.toString(), note: 'Base Case' });
             await commitStep(2);

             updateFrameRef(frameId, { status: 'completed', note: undefined });
             freeStackMemory(depth);
             stackRef.current = stackRef.current.slice(0, -1);
             await commitStep(2);
             return res;
        }

        // Left
        updateFrameRef(frameId, { status: 'pending' });
        await commitStep(7);
        const left = await run(currentN - 1, frameId, depth + 1);

        // Right
        updateFrameRef(frameId, { status: 'active', note: `Wait...` });
        await commitStep(8);
        updateFrameRef(frameId, { status: 'pending' });
        const right = await run(currentN - 2, frameId, depth + 1);

        // Calc
        const result = left + right;
        updateFrameRef(frameId, { status: 'active', note: `${left} + ${right}` });
        addLog(`合并: ${left} + ${right} = ${result}`, 'success');
        await commitStep(10);
        
        updateFrameRef(frameId, { status: 'returning', returnValue: result.toString(), note: undefined });
        await commitStep(10);
        
        updateFrameRef(frameId, { status: 'completed' });
        freeStackMemory(depth);
        stackRef.current = stackRef.current.slice(0, -1);
        await commitStep(10);
        return result;
    };

    await run(n, null, 1);
    setIsProcessing(false);
  };

  const handlePalindrome = async () => {
      if (isProcessing) return;
      resetEngine();
      setIsProcessing(true);
      setSelectedAlgo(AlgorithmType.PALINDROME);
      
      const s = inputStr || "racecar";
      addLog(`准备运行: Palindrome("${s}")`, 'system');

      const run = async (currStr: string, parentId: string | null, depth: number): Promise<boolean> => {
          stackRef.current = [...stackRef.current, { id: uuidv4(), functionName: 'isPal', args: { s: `"${currStr}"` }, line: 0 }];
          await commitStep(0);
          
          const frameId = createFrameRef('isPal', `"${currStr}"`, parentId, depth);
          await commitStep(0);

          if (currStr.length <= 1) {
              updateFrameRef(frameId, { status: 'returning', returnValue: 'true', note: 'Base Case' });
              await commitStep(2);
              updateFrameRef(frameId, { status: 'completed' });
              freeStackMemory(depth);
              stackRef.current = stackRef.current.slice(0, -1);
              await commitStep(2);
              return true;
          }

          if (currStr[0] !== currStr[currStr.length - 1]) {
             updateFrameRef(frameId, { status: 'returning', returnValue: 'false', note: 'Mismatch' });
             await commitStep(5);
             updateFrameRef(frameId, { status: 'completed' });
             freeStackMemory(depth);
             stackRef.current = stackRef.current.slice(0, -1);
             await commitStep(5);
             return false;
          }

          updateFrameRef(frameId, { status: 'pending', note: 'Check inner...' });
          await commitStep(9);
          const sub = currStr.substring(1, currStr.length - 1);
          const res = await run(sub, frameId, depth + 1);

          updateFrameRef(frameId, { status: 'active', note: `Res: ${res}` });
          await commitStep(9);

          updateFrameRef(frameId, { status: 'returning', returnValue: res.toString() });
          await commitStep(9);
          
          updateFrameRef(frameId, { status: 'completed' });
          freeStackMemory(depth);
          stackRef.current = stackRef.current.slice(0, -1);
          await commitStep(9);
          return res;
      };

      await run(s, null, 1);
      setIsProcessing(false);
  };

  const handlePower = async () => {
      if (isProcessing) return;
      resetEngine();
      setIsProcessing(true);
      setSelectedAlgo(AlgorithmType.POWER);
      
      const x = 2; 
      const n = Math.min(parseInt(inputN) || 5, 8);
      
      const run = async (curN: number, parentId: string | null, depth: number): Promise<number> => {
          stackRef.current = [...stackRef.current, { id: uuidv4(), functionName: 'pow', args: {x, n: curN}, line: 0 }];
          await commitStep(0);
          
          const frameId = createFrameRef('pow', `x=2,n=${curN}`, parentId, depth);
          await commitStep(0);
          
          if (curN === 0) {
              updateFrameRef(frameId, { status: 'returning', returnValue: '1', note: 'Base Case' });
              await commitStep(2);
              updateFrameRef(frameId, { status: 'completed' });
              freeStackMemory(depth);
              stackRef.current = stackRef.current.slice(0, -1);
              await commitStep(2);
              return 1;
          }
          
          updateFrameRef(frameId, { status: 'pending' });
          await commitStep(6);
          const prev = await run(curN - 1, frameId, depth + 1);
          
          updateFrameRef(frameId, { status: 'active', note: `${x} * ${prev}` });
          await commitStep(7);
          
          const res = x * prev;
          updateFrameRef(frameId, { status: 'returning', returnValue: res.toString() });
          await commitStep(7);
          updateFrameRef(frameId, { status: 'completed' });
          freeStackMemory(depth);
          stackRef.current = stackRef.current.slice(0, -1);
          await commitStep(7);
          return res;
      };
      
      await run(n, null, 1);
      setIsProcessing(false);
  };

  // --- Resizing Logic ---
  const startResizingLeft = useCallback(() => setIsResizingLeft(true), []);
  const startResizingRight = useCallback(() => setIsResizingRight(true), []);
  const stopResizing = useCallback(() => {
    setIsResizingLeft(false);
    setIsResizingRight(false);
  }, []);

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = mouseMoveEvent.clientX;
        if (newWidth > 200 && newWidth < 600) setLeftWidth(newWidth);
      }
      if (isResizingRight) {
        const newWidth = window.innerWidth - mouseMoveEvent.clientX;
        if (newWidth > 250 && newWidth < 800) setRightWidth(newWidth);
      }
    },
    [isResizingLeft, isResizingRight]
  );

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  // --- Render ---

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] text-gray-800 font-sans overflow-hidden" ref={appContainerRef}>
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shrink-0 z-30">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
                R
            </div>
            <h1 className="text-lg font-bold text-gray-800 tracking-tight hidden sm:block">RecurVis <span className="font-normal text-gray-400 text-sm ml-2">C++ 递归可视化</span></h1>
        </div>
        
        {/* Playback Controls */}
        <div className="flex items-center gap-4 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
             <span className="text-xs font-bold text-gray-400 uppercase mr-1">速度</span>
             <button onClick={() => setSpeed(1)} className={`p-1.5 rounded ${speed === 1 ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400 hover:text-gray-600'}`} title="1x Speed"><Play size={14} /></button>
             <button onClick={() => setSpeed(2)} className={`p-1.5 rounded ${speed === 2 ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400 hover:text-gray-600'}`} title="2x Speed"><FastForward size={14} /></button>
             <button onClick={() => setSpeed(5)} className={`p-1.5 rounded ${speed === 5 ? 'bg-white shadow-sm text-brand-600' : 'text-gray-400 hover:text-gray-600'}`} title="5x Speed"><SkipForward size={14} /></button>
             <button onClick={() => setSpeed(99)} className={`px-2 py-0.5 rounded text-xs font-bold ${speed === 99 ? 'bg-brand-500 text-white shadow-sm' : 'text-gray-400 hover:bg-gray-200'}`} title="Instant">MAX</button>
        </div>

        <div className="flex items-center gap-2">
             <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"><Settings size={18} /></button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* Left: Controls */}
        <div 
          className="w-full bg-white border-b lg:border-b-0 flex flex-col shrink-0 z-20 shadow-sm h-auto max-h-[35vh] lg:max-h-full overflow-y-auto lg:h-full relative"
          style={{ width: window.innerWidth >= 1024 ? leftWidth : '100%' }}
        >
            <PanelHeader icon={Terminal} title="控制台" />
            <div className="p-4 space-y-6">
                <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">输入参数</label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                            <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-medium text-gray-400">N (整数)</label>
                            <input type="number" value={inputN} onChange={(e) => setInputN(e.target.value)} className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
                        </div>
                         <div className="relative">
                            <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-medium text-gray-400">Str</label>
                            <input type="text" value={inputStr} onChange={(e) => setInputStr(e.target.value)} className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none" />
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">算法选择</label>
                    <Button onClick={handleFactorial} disabled={isProcessing} variant="filled" className="w-full justify-between">
                         <span>阶乘 Factorial (n!)</span> <Calculator size={14} className="opacity-70" />
                    </Button>
                    <Button onClick={handleFibonacci} disabled={isProcessing} variant="primary" className="w-full justify-between">
                         <span>斐波那契 Fibonacci</span> <GitBranch size={14} className="text-gray-400" />
                    </Button>
                    <Button onClick={handlePower} disabled={isProcessing} variant="primary" className="w-full justify-between">
                         <span>幂运算 Power</span> <Zap size={14} className="text-gray-400" />
                    </Button>
                    <Button onClick={handlePalindrome} disabled={isProcessing} variant="primary" className="w-full justify-between">
                         <span>回文 Palindrome</span> <Type size={14} className="text-gray-400" />
                    </Button>
                    <div className="pt-2">
                        <Button onClick={resetEngine} disabled={isProcessing} variant="danger" className="w-full">
                            <RotateCcw size={14} /> 重置
                        </Button>
                    </div>
                </div>

                <div className="hidden lg:block pt-4 border-t border-gray-100">
                     <span className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2 mb-3">
                        <Cpu size={14} /> 栈内存分配 (Depth View)
                    </span>
                    <div className="grid grid-cols-4 gap-1.5">
                        {memory.slice(0, 16).map((block, idx) => (
                            <div key={idx} className={`relative h-6 rounded border text-[9px] font-mono flex items-center justify-center transition-colors ${block.isOccupied ? 'bg-brand-500 border-brand-600 text-white' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                {block.isOccupied ? <span className="truncate px-1">{block.value}</span> : <span>{idx}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Drag Handle Left */}
        <div className="hidden lg:flex w-1 bg-gray-100 hover:bg-brand-400 cursor-col-resize items-center justify-center z-30 transition-colors" onMouseDown={startResizingLeft}><GripVertical size={10} className="text-gray-300" /></div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col relative bg-[#f0f2f5]">
            <div className="absolute inset-0 grid-pattern opacity-60 pointer-events-none"></div>
            
            {/* Toolbar */}
            <div className="absolute top-4 right-4 bg-white rounded-lg shadow-sm border border-gray-200 p-1 flex gap-1 z-10">
                 <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 hover:bg-gray-50 rounded text-gray-500"><ZoomOut size={16} /></button>
                 <span className="px-1 py-1.5 text-xs font-mono text-gray-400 min-w-[2.5rem] text-center">{Math.round(zoom * 100)}%</span>
                 <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-1.5 hover:bg-gray-50 rounded text-gray-500"><ZoomIn size={16} /></button>
                 <button onClick={() => setZoom(1)} className="p-1.5 hover:bg-gray-50 rounded text-gray-500"><Maximize2 size={16} /></button>
            </div>

            {/* Tree Area */}
            <div className="flex-1 overflow-auto flex items-start justify-center p-8 pt-16">
                <div className="transition-transform duration-300 ease-out origin-top-center" style={{ transform: `scale(${zoom})` }}>
                    {rootId ? (
                        <TreeNode frameId={rootId} frames={frames} isRoot={true} />
                    ) : (
                        <div className="flex flex-col items-center justify-center opacity-40 mt-20">
                            <GitBranch size={48} className="text-gray-400 mb-4" />
                            <h3 className="text-gray-500 font-medium">准备就绪</h3>
                            <p className="text-sm">点击左侧运行算法</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Timeline Scrubber (Bottom) */}
            <div className="h-12 bg-white border-t border-gray-200 flex items-center px-4 gap-4 shrink-0 z-20">
                <div className="text-xs font-mono text-gray-500 whitespace-nowrap w-16">
                    Step {currentStep}/{totalSteps > 0 ? totalSteps - 1 : 0}
                </div>
                <input 
                    type="range" 
                    min="0" 
                    max={totalSteps > 0 ? totalSteps - 1 : 0} 
                    value={currentStep}
                    onChange={(e) => jumpToStep(parseInt(e.target.value))}
                    disabled={totalSteps === 0 || isProcessing}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 accent-brand-500"
                />
            </div>
        </div>

        {/* Drag Handle Right */}
        <div className="hidden lg:flex w-1 bg-gray-100 hover:bg-brand-400 cursor-col-resize items-center justify-center z-30 transition-colors" onMouseDown={startResizingRight}><GripVertical size={10} className="text-gray-300" /></div>

        {/* Right: Code & Logs */}
        <div 
            className="hidden lg:flex bg-white border-l border-gray-200 flex-col shrink-0 z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]"
            style={{ width: window.innerWidth >= 1024 ? rightWidth : '100%' }}
        >
            {/* Stack */}
            <div className="h-1/3 flex flex-col border-b border-gray-200">
                 <PanelHeader icon={Layers} title="Call Stack" extra={<span className="text-xs text-gray-400 font-mono">Size: {stack.length}</span>} />
                 <div className="flex-1 overflow-y-auto p-2 bg-gray-50/50 flex flex-col-reverse justify-end gap-1">
                     {stack.map((frame) => (
                         <div key={frame.id} className="px-3 py-2 rounded bg-white border border-gray-200 shadow-sm text-xs font-mono flex justify-between items-center animate-in slide-in-from-top-1">
                             <span className="font-semibold text-gray-700">{frame.functionName}</span>
                             <span className="text-[10px] text-gray-400">{JSON.stringify(frame.args).replace(/["{}]/g, '')}</span>
                         </div>
                     ))}
                 </div>
            </div>

            {/* Code */}
            <div className="flex-1 flex flex-col bg-[#FDFBF7]">
                <PanelHeader icon={Terminal} title="Source Code (C++)" />
                <div className="flex-1 overflow-auto p-4">
                    <pre className="font-mono text-[11px] leading-5">
                        {CODE_SNIPPETS[selectedAlgo].split('\n').map((line, idx) => (
                            <div key={idx} className={`relative pl-6 pr-2 rounded ${idx === activeLine ? 'bg-brand-100 text-brand-900 font-bold' : 'text-gray-500'}`}>
                                <span className="absolute left-1 text-gray-300 text-[9px] select-none">{idx + 1}</span>
                                {line}
                            </div>
                        ))}
                    </pre>
                </div>
            </div>

            {/* Logs */}
            <div className="h-40 border-t border-gray-200 flex flex-col bg-white">
                <div className="px-3 py-2 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase">System Logs</div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[10px]">
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-2">
                            <span className="text-gray-300 shrink-0">{log.timestamp.split(' ')[0]}</span>
                            <span className={`${log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-green-600' : 'text-gray-600'}`}>{log.message}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}
