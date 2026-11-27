import React from 'react';
import { Check, Copy } from 'lucide-react';

interface HeaderBarProps {
  activeSection: string;
  onNavigateSection: (sectionId: string) => void;
  onOpenDrafts: () => void;
  draftCount: number;
  onCopyFullPost: () => void;
  copiedFull: boolean;
  canCopy: boolean;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeSection,
  onNavigateSection,
  onOpenDrafts,
  draftCount,
  onCopyFullPost,
  copiedFull,
  canCopy,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigateSection('top');
          }}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          社群貼文小幫手
        </a>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onNavigateSection('step-photos')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeSection === 'step-photos'
                ? 'text-slate-900 border-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            1. 上傳照片
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('step-caption')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeSection === 'step-caption'
                ? 'text-slate-900 border-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            2. 撰寫貼文
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('step-hashtags')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeSection === 'step-hashtags'
                ? 'text-slate-900 border-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            3. 加入 Hashtag
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('step-audit')}
            className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              activeSection === 'step-audit'
                ? 'text-slate-900 border-blue-600'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            4. 缺漏檢查
          </button>
          <button
            type="button"
            onClick={onOpenDrafts}
            className="py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 border-transparent hover:text-slate-900 tabular-nums"
          >
            草稿紀錄 ({draftCount})
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onCopyFullPost}
            disabled={!canCopy}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            {copiedFull ? (
              <>
                <Check className="w-4 h-4" />
                <span>已複製貼文</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>複製完整貼文</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
