import React from 'react';
import {
  AtSign,
  CalendarClock,
  Link2,
  Loader2,
  MapPin,
  PenLine,
  Wand2,
} from 'lucide-react';
import { PLATFORMS, PlatformId, TONES, ToneId } from '../types/post';

interface PostComposerProps {
  platform: PlatformId;
  onChangePlatform: (platform: PlatformId) => void;
  tone: ToneId;
  onChangeTone: (tone: ToneId) => void;
  topic: string;
  onChangeTopic: (topic: string) => void;
  caption: string;
  onChangeCaption: (caption: string) => void;
  imageObservation: string;
  location: string;
  onChangeLocation: (val: string) => void;
  mention: string;
  onChangeMention: (val: string) => void;
  linkNote: string;
  onChangeLinkNote: (val: string) => void;
  scheduledTime: string;
  onChangeScheduledTime: (val: string) => void;
  onGeneratePost: () => void;
  isGenerating: boolean;
  onRefinePost: (
    action: 'shorter' | 'vivid' | 'stronger_cta' | 'proofread' | 'threads_style'
  ) => void;
  isRefining: boolean;
  captionRef?: React.RefObject<HTMLTextAreaElement | null>;
  locationInputRef?: React.RefObject<HTMLInputElement | null>;
}

const PLATFORM_LIST: PlatformId[] = ['instagram', 'threads', 'facebook', 'linkedin', 'line'];

const QUICK_EMOJIS = ['✨', '☕️', '📸', '💡', '👇', '💬', '📍', '🌿', '🤍', '🔖'];

const REFINE_ACTIONS: Array<{
  id: 'shorter' | 'vivid' | 'stronger_cta' | 'proofread' | 'threads_style';
  label: string;
}> = [
  { id: 'shorter', label: '精簡篇幅' },
  { id: 'vivid', label: '更生動有感' },
  { id: 'stronger_cta', label: '補強互動結尾' },
  { id: 'proofread', label: '順稿除錯' },
  { id: 'threads_style', label: '轉為 Threads 短口語' },
];

export const PostComposer: React.FC<PostComposerProps> = ({
  platform,
  onChangePlatform,
  tone,
  onChangeTone,
  topic,
  onChangeTopic,
  caption,
  onChangeCaption,
  imageObservation,
  location,
  onChangeLocation,
  mention,
  onChangeMention,
  linkNote,
  onChangeLinkNote,
  scheduledTime,
  onChangeScheduledTime,
  onGeneratePost,
  isGenerating,
  onRefinePost,
  isRefining,
  captionRef,
  locationInputRef,
}) => {
  const spec = PLATFORMS[platform];
  const charCount = caption.trim().length;
  const firstLineLength = (caption.trim().split(/\n+/)[0] || '').length;
  const isOverLimit = charCount > spec.maxChars;
  const isFirstLineTooLong = firstLineLength > spec.foldChars;

  const insertEmoji = (emoji: string) => {
    const el = captionRef?.current;
    if (!el) {
      onChangeCaption(`${caption}${emoji}`);
      return;
    }
    const start = el.selectionStart ?? caption.length;
    const end = el.selectionEnd ?? caption.length;
    const next = caption.slice(0, start) + emoji + caption.slice(end);
    onChangeCaption(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  return (
    <section
      id="step-caption"
      className="bg-white border border-slate-200 rounded-xl p-6 scroll-mt-20"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            02. 設定平台並撰寫貼文
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">{spec.tip}</p>
        </div>
      </div>

      {/* Platform & Tone selection */}
      <div className="mt-5 space-y-4">
        <div>
          <div className="text-xs font-medium text-slate-600 mb-2">發布平台</div>
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {PLATFORM_LIST.map((pid) => {
              const item = PLATFORMS[pid];
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => onChangePlatform(pid)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    platform === pid
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-slate-600 mb-2">貼文語氣</div>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeTone(t.id)}
                title={t.description}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tone === t.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Topic / brief input + AI generate button */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label htmlFor="topic-input" className="text-xs font-medium text-slate-600">
              貼文想傳達的重點或背景（可留白直接讓 AI 看圖發揮）
            </label>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="topic-input"
              type="text"
              value={topic}
              onChange={(e) => onChangeTopic(e.target.value)}
              placeholder="例如：這間台北大安區新開的咖啡廳，杏仁可頌剛出爐超酥脆，週末很適合帶書來發呆"
              className="flex-1 px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
            <button
              type="button"
              onClick={onGeneratePost}
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>正在生成貼文...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>AI 看圖寫文與推薦標籤</span>
                </>
              )}
            </button>
          </div>
        </div>

        {imageObservation && (
          <div className="px-3.5 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">AI 圖片判讀摘要：</span>
            <span>{imageObservation}</span>
          </div>
        )}
      </div>

      {/* Main Caption Editor */}
      <div className="mt-5 pt-5 border-t border-slate-100">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <label
            htmlFor="caption-editor"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800"
          >
            <PenLine className="w-4 h-4 text-slate-500" />
            <span>貼文本文編輯區</span>
          </label>
          <div className="flex items-center gap-2 text-xs text-slate-500 tabular-nums">
            <span className={isOverLimit ? 'text-red-600 font-semibold' : ''}>
              {charCount} / {spec.maxChars} 字
            </span>
            <span aria-hidden="true">·</span>
            <span className={isFirstLineTooLong ? 'text-amber-600 font-medium' : ''}>
              首行 {firstLineLength} 字（摺疊線約 {spec.foldChars} 字）
            </span>
          </div>
        </div>

        <textarea
          ref={captionRef}
          id="caption-editor"
          rows={9}
          value={caption}
          onChange={(e) => onChangeCaption(e.target.value)}
          placeholder="在這裡撰寫貼文，或點擊上方「AI 看圖寫文」產生初稿再微調語氣與段落..."
          className="w-full px-4 py-3 text-[15px] leading-relaxed text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-y"
        />

        {/* Quick Emoji & AI Refine toolbar */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-slate-400 mr-1">插入表情：</span>
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="w-7 h-7 flex items-center justify-center text-sm rounded hover:bg-slate-100 transition-colors cursor-pointer"
                title={`插入 ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {REFINE_ACTIONS.map((act) => (
              <button
                key={act.id}
                type="button"
                disabled={isRefining || !caption.trim()}
                onClick={() => onRefinePost(act.id)}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 disabled:opacity-40 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                {act.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Publishing metadata fields: Location, Mention, Link Note, Schedule */}
      <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="location-input"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5"
          >
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span>打卡地點（選填）</span>
          </label>
          <input
            ref={locationInputRef}
            id="location-input"
            type="text"
            value={location}
            onChange={(e) => onChangeLocation(e.target.value)}
            placeholder="例如：台北大安區 · 某某咖啡"
            className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label
            htmlFor="mention-input"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5"
          >
            <AtSign className="w-3.5 h-3.5 text-slate-400" />
            <span>標註合作帳號 / 攝影師（選填）</span>
          </label>
          <input
            id="mention-input"
            type="text"
            value={mention}
            onChange={(e) => onChangeMention(e.target.value)}
            placeholder="例如：@cafe_roastery"
            className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label
            htmlFor="link-note-input"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5"
          >
            <Link2 className="w-3.5 h-3.5 text-slate-400" />
            <span>導流連結備忘（主頁 / 限動 / 首則留言）</span>
          </label>
          <input
            id="link-note-input"
            type="text"
            value={linkNote}
            onChange={(e) => onChangeLinkNote(e.target.value)}
            placeholder="例如：已更新至 IG 主頁 Linktree"
            className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>

        <div>
          <label
            htmlFor="schedule-input"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1.5"
          >
            <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
            <span>預計發布時段備忘</span>
          </label>
          <input
            id="schedule-input"
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => onChangeScheduledTime(e.target.value)}
            className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 tabular-nums"
          />
        </div>
      </div>
    </section>
  );
};
