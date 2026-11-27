import React, { useState } from 'react';
import { Check, Copy, Hash, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import {
  HashtagPlacement,
  HashtagSuggestions,
  PLATFORMS,
  PlatformId,
} from '../types/post';
import { formatTagsOnly, normalizeTag } from '../utils/auditRules';

interface HashtagStudioProps {
  platform: PlatformId;
  hashtags: string[];
  onChangeHashtags: (tags: string[]) => void;
  suggestions: HashtagSuggestions;
  placement: HashtagPlacement;
  onChangePlacement: (placement: HashtagPlacement) => void;
  onRequestSuggestions: () => void;
  isSuggesting: boolean;
  hashtagInputRef?: React.RefObject<HTMLInputElement | null>;
}

const PLACEMENT_OPTIONS: Array<{ value: HashtagPlacement; label: string }> = [
  { value: 'inline', label: '接在內文下方' },
  { value: 'spaced', label: '空兩行置底' },
  { value: 'comment', label: '另放留言區' },
];

export const HashtagStudio: React.FC<HashtagStudioProps> = ({
  platform,
  hashtags,
  onChangeHashtags,
  suggestions,
  placement,
  onChangePlacement,
  onRequestSuggestions,
  isSuggesting,
  hashtagInputRef,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [copiedTags, setCopiedTags] = useState(false);
  const spec = PLATFORMS[platform];

  const addTag = (raw: string) => {
    const tokens = raw
      .split(/[\s,，、;；\n]+/)
      .map(normalizeTag)
      .filter(Boolean);
    if (tokens.length === 0) return;

    const existingLower = new Set(hashtags.map((t) => t.toLowerCase()));
    const next = [...hashtags];
    for (const token of tokens) {
      if (!existingLower.has(token.toLowerCase())) {
        existingLower.add(token.toLowerCase());
        next.push(token);
      }
    }
    onChangeHashtags(next);
  };

  const toggleTag = (tag: string) => {
    const clean = normalizeTag(tag);
    if (!clean) return;
    const exists = hashtags.some((t) => t.toLowerCase() === clean.toLowerCase());
    if (exists) {
      onChangeHashtags(hashtags.filter((t) => t.toLowerCase() !== clean.toLowerCase()));
    } else {
      onChangeHashtags([...hashtags, clean]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
      setInputValue('');
    }
  };

  const handleCopyTags = async () => {
    const text = formatTagsOnly(hashtags);
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 1800);
  };

  const hasAnySuggestions =
    suggestions.core.length > 0 ||
    suggestions.niche.length > 0 ||
    suggestions.local.length > 0;

  const renderGroup = (title: string, hint: string, list: string[]) => {
    if (list.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{title}</span>
          <span aria-hidden="true">·</span>
          <span>{hint}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {list.map((tag) => {
            const clean = normalizeTag(tag);
            const isSelected = hashtags.some((t) => t.toLowerCase() === clean.toLowerCase());
            return (
              <button
                key={clean}
                type="button"
                onClick={() => toggleTag(clean)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>#{clean}</span>
                {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-slate-400" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section
      id="step-hashtags"
      className="bg-white border border-slate-200 rounded-xl p-6 scroll-mt-20"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            03. 加入與管理 Hashtag
          </h2>
          <p className="text-sm text-slate-500 mt-0.5 tabular-nums">
            {spec.name} 建議使用 {spec.idealHashtagsMin}～{spec.idealHashtagsMax} 個標籤（上限 {spec.maxHashtags} 個）· 目前已選 {hashtags.length} 個
          </p>
        </div>

        <button
          type="button"
          onClick={onRequestSuggestions}
          disabled={isSuggesting}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {isSuggesting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>{isSuggesting ? 'AI 分析推薦中...' : 'AI 推薦相關 Hashtag'}</span>
        </button>
      </div>

      {/* Custom tag input */}
      <div className="mt-5 flex gap-2">
        <div className="relative flex-1">
          <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            ref={hashtagInputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入自訂標籤後按 Enter（可用空白一次新增多個，例如：台北咖啡廳 週末早午餐）"
            className="w-full pl-9 pr-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            addTag(inputValue);
            setInputValue('');
          }}
          disabled={!inputValue.trim()}
          className="px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          加入
        </button>
      </div>

      {/* Selected hashtags */}
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-slate-600">已選用的標籤</span>
          {hashtags.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopyTags}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                {copiedTags ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTags ? '已複製標籤' : '只複製標籤'}</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeHashtags([])}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清空</span>
              </button>
            </div>
          )}
        </div>

        {hashtags.length === 0 ? (
          <div className="py-4 px-4 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-500">
            尚未選擇任何 Hashtag。請在上方輸入關鍵字，或點擊「AI 推薦相關 Hashtag」自動產生。
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
            {hashtags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                title="點擊移除此標籤"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded-md hover:border-red-300 hover:text-red-700 transition-colors cursor-pointer"
              >
                <span>#{tag}</span>
                <X className="w-3 h-3 text-slate-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Placement options */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-medium text-slate-600">複製與預覽排版位置</span>
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {PLACEMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChangePlacement(opt.value)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                placement === opt.value
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI suggestions */}
      {hasAnySuggestions && (
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-4">
          {renderGroup('核心大流量', '高曝光搜尋入口', suggestions.core)}
          {renderGroup('精準主題詞', '鎖定真實興趣受眾', suggestions.niche)}
          {renderGroup('情境與在地', '強化場景與地域連結', suggestions.local)}
        </div>
      )}
    </section>
  );
};
