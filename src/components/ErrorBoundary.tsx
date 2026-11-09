import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled interface exception caught by ErrorBoundary:', error, errorInfo);
  }

  private handleResetAndReload = () => {
    try {
      localStorage.removeItem('kiral_analysis_enabled');
      localStorage.removeItem('kiral_active_ranked_match');
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  private handleSimpleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0A0A0A] text-[#EDEDED] flex flex-col items-center justify-center p-4 select-none">
          <div className="max-w-md w-full bg-[#121212] border border-[#262626] rounded-xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#1baca6]/15 border border-[#1baca6]/30 flex items-center justify-center text-[#1baca6] mb-4">
              <AlertTriangle className="w-6 h-6" strokeWidth={1.5} />
            </div>

            <h1 className="text-base font-mono font-bold tracking-tight text-white mb-2">
              Интерфейс восстановлен после сбоя
            </h1>

            <p className="text-xs font-mono text-[#888888] mb-6 leading-relaxed">
              Обнаружена непредвиденная ошибка отображения. Нажмите кнопку ниже для безопасного сброса временных параметров и перезапуска.
            </p>

            {this.state.error && (
              <div className="w-full p-2.5 rounded bg-[#0A0A0A] border border-[#222222] text-[11px] font-mono text-rose-400 mb-6 truncate text-left">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full">
              <button
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 px-4 rounded-lg bg-[#1baca6] hover:bg-[#20c2bc] text-black font-mono font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Восстановить и сбросить</span>
              </button>

              <button
                onClick={this.handleSimpleReload}
                className="w-full py-2.5 px-4 rounded-lg bg-[#1F1F1F] hover:bg-[#2A2A2A] text-[#CCCCCC] hover:text-white border border-[#2E2E2E] font-mono text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Обновить</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
