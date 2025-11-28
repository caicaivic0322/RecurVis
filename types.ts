
export interface RecursiveFrame {
  id: string;
  name: string;      // e.g., "fib(3)"
  args: string;      // e.g., "n=3"
  returnValue?: string; // e.g., "2"
  note?: string;        // e.g., "5 * 24" (New field for calculation details)
  children: string[];   // IDs of recursive calls spawned by this frame
  status: 'pending' | 'active' | 'completed' | 'returning';
  depth: number;
}

export interface MemoryBlock {
  address: string;
  isOccupied: boolean;
  frameId?: string;
  value?: string; // To show what's stored
  depth?: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'system';
}

export interface StackFrame {
  id: string;
  functionName: string;
  args: Record<string, any>;
  line?: number;
  highlight?: boolean;
}

export enum AlgorithmType {
  FACTORIAL = 'FACTORIAL',
  FIBONACCI = 'FIBONACCI',
  POWER = 'POWER',
  PALINDROME = 'PALINDROME'
}

export interface HistorySnapshot {
  frames: RecursiveFrame[];
  memory: MemoryBlock[];
  stack: StackFrame[];
  logs: LogEntry[];
  activeLine: number;
  rootId: string | null;
}
