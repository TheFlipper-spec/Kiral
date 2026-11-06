import type { EngineEvaluation } from '../types/chess';

interface QueueTask {
  fen: string;
  depth: number;
  resolve: (evalResult: EngineEvaluation) => void;
}

export class StockfishService {
  private worker: Worker | null = null;
  public isReady = false;
  private queue: QueueTask[] = [];
  private activeTask: QueueTask | null = null;
  private currentEvaluation: Partial<EngineEvaluation> = {};
  private activeColor: 'w' | 'b' = 'w';
  private initPromise: Promise<void> | null = null;
  private isTerminated = false;
  private watchdogTimer: number | null = null;
  private onReadyCallback: (() => void) | null = null;

  constructor() {
    this.init();
  }

  public init(): Promise<void> {
    if (this.initPromise && this.worker && !this.isTerminated) return this.initPromise;

    this.isTerminated = false;
    this.initPromise = new Promise((resolve) => {
      try {
        if (typeof window === 'undefined' || typeof Worker === 'undefined') {
          resolve();
          return;
        }

        if (this.worker) {
          try {
            this.worker.terminate();
          } catch {}
          this.worker = null;
        }

        const baseUrl = import.meta.env.BASE_URL || './';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        this.worker = new Worker(`${cleanBase}stockfish.js`);
        this.worker.onmessage = (event: MessageEvent) => {
          this.handleWorkerMessage(event.data);
        };

        this.worker.onerror = (err) => {
          console.error('Stockfish worker error:', err);
          this.isReady = false;
          resolve();
        };

        this.send('uci');
        this.send('setoption name MultiPV value 2');
        this.send('isready');

        const timer = setTimeout(() => {
          this.isReady = true;
          resolve();
        }, 1500);

        this.onReadyCallback = () => {
          clearTimeout(timer);
          this.isReady = true;
          resolve();
        };
      } catch (err) {
        console.error('Failed to instantiate Stockfish worker:', err);
        resolve();
      }
    });

    return this.initPromise;
  }

  private send(cmd: string) {
    if (this.worker && !this.isTerminated) {
      this.worker.postMessage(cmd);
    }
  }

  private handleWorkerMessage(line: unknown) {
    if (typeof line !== 'string') return;

    if (line.includes('readyok')) {
      if (this.onReadyCallback) {
        this.onReadyCallback();
        this.onReadyCallback = null;
      }
    }

    if (line.startsWith('info ') && line.includes(' score ')) {
      this.parseInfoLine(line);
    }

    if (line.startsWith('bestmove ')) {
      if (this.watchdogTimer) {
        clearTimeout(this.watchdogTimer);
        this.watchdogTimer = null;
      }

      const parts = line.split(' ');
      const rawBestMove = parts[1] || '';
      const bestMove = rawBestMove === '(none)' ? '' : rawBestMove;

      const finalEval: EngineEvaluation = {
        cp: this.currentEvaluation.cp ?? 0,
        mate: this.currentEvaluation.mate ?? null,
        depth: this.currentEvaluation.depth ?? 14,
        pv: this.currentEvaluation.pv ?? (bestMove ? [bestMove] : []),
        bestMove: bestMove || this.currentEvaluation.bestMove || '',
        secondBest: this.currentEvaluation.secondBest
      };

      if (this.activeTask) {
        const task = this.activeTask;
        this.activeTask = null;
        task.resolve(finalEval);
      }

      // Process next item in queue
      this.processNextTask();
    }
  }

  private parseInfoLine(line: string) {
    const multipvMatch = line.match(/multipv\s+(\d+)/);
    const multipv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;

    const depthMatch = line.match(/depth\s+(\d+)/);
    const depth = depthMatch ? parseInt(depthMatch[1], 10) : 14;

    let cp: number | undefined;
    let mate: number | null = null;

    const cpMatch = line.match(/score\s+cp\s+(-?\d+)/);
    if (cpMatch) {
      const rawCp = parseInt(cpMatch[1], 10);
      cp = this.activeColor === 'b' ? -rawCp : rawCp;
    }

    const mateMatch = line.match(/score\s+mate\s+(-?\d+)/);
    if (mateMatch) {
      const rawMate = parseInt(mateMatch[1], 10);
      mate = this.activeColor === 'b' ? -rawMate : rawMate;
      cp = mate > 0 ? 10000 - mate * 100 : -10000 - mate * 100;
    }

    const pvIndex = line.indexOf(' pv ');
    let pvMoves: string[] = [];
    let bestMove = '';
    if (pvIndex !== -1) {
      pvMoves = line.substring(pvIndex + 4).trim().split(/\s+/);
      bestMove = pvMoves[0] || '';
    }

    if (multipv === 1) {
      if (cp !== undefined) this.currentEvaluation.cp = cp;
      this.currentEvaluation.mate = mate;
      this.currentEvaluation.depth = depth;
      if (pvMoves.length > 0) this.currentEvaluation.pv = pvMoves;
      if (bestMove) this.currentEvaluation.bestMove = bestMove;
    } else if (multipv === 2) {
      this.currentEvaluation.secondBest = {
        cp: cp ?? 0,
        mate,
        pv: pvMoves,
        bestMove
      };
    }
  }

  private processNextTask() {
    if (this.activeTask || this.queue.length === 0) return;

    this.activeTask = this.queue.shift()!;
    const { fen, depth } = this.activeTask;

    const fenParts = fen.split(' ');
    this.activeColor = (fenParts[1] as 'w' | 'b') || 'w';

    this.currentEvaluation = {
      cp: 0,
      mate: null,
      depth,
      pv: [],
      bestMove: ''
    };

    if (!this.worker) {
      const task = this.activeTask;
      this.activeTask = null;
      task.resolve({
        cp: 0,
        mate: null,
        depth: 1,
        pv: [],
        bestMove: ''
      });
      this.processNextTask();
      return;
    }

    this.send(`position fen ${fen}`);
    this.send(`go depth ${depth}`);

    // Fail-safe watchdog timeout
    this.watchdogTimer = window.setTimeout(() => {
      if (this.activeTask) {
        const task = this.activeTask;
        this.activeTask = null;
        task.resolve({
          cp: this.currentEvaluation.cp ?? 0,
          mate: this.currentEvaluation.mate ?? null,
          depth: this.currentEvaluation.depth ?? depth,
          pv: this.currentEvaluation.pv ?? [],
          bestMove: this.currentEvaluation.bestMove || ''
        });
        this.processNextTask();
      }
    }, 7000);
  }

  public async evaluate(fen: string, depth = 14): Promise<EngineEvaluation> {
    await this.init();

    return new Promise((resolve) => {
      this.queue.push({ fen, depth, resolve });
      if (!this.activeTask) {
        this.processNextTask();
      }
    });
  }

  public setSkillLevel(level: number) {
    const clamped = Math.max(0, Math.min(20, Math.round(level)));
    this.send(`setoption name Skill Level value ${clamped}`);
  }

  public stop() {
    this.send('stop');
  }

  public clearQueue() {
    this.stop();
    // Resolve any pending items with neutral eval
    const pending = [...this.queue];
    this.queue = [];
    if (this.activeTask) {
      this.activeTask.resolve({
        cp: this.currentEvaluation.cp ?? 0,
        mate: this.currentEvaluation.mate ?? null,
        depth: this.currentEvaluation.depth ?? 1,
        pv: [],
        bestMove: ''
      });
      this.activeTask = null;
    }
    pending.forEach((t) =>
      t.resolve({
        cp: 0,
        mate: null,
        depth: 1,
        pv: [],
        bestMove: ''
      })
    );
  }

  public terminate() {
    this.isTerminated = true;
    this.initPromise = null;
    this.clearQueue();
    if (this.worker) {
      try {
        this.send('quit');
        this.worker.terminate();
      } catch {}
      this.worker = null;
    }
  }
}

export const stockfish = new StockfishService();
