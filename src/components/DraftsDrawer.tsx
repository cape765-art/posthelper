import React from 'react';
import { Clock, FolderOpen, Plus, Trash2, X } from 'lucide-react';
import { DraftRecord, PLATFORMS } from '../types/post';

interface DraftsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: DraftRecord[];
  onSaveCurrentAsDraft: () => void;
  onLoadDraft: (draft: DraftRecord) => void;
  onDeleteDraft: (id: string) => void;
}

export const DraftsDrawer: React.FC<DraftsDrawerProps> = ({
  isOpen,
  onClose,
  drafts,
  onSaveCurrentAsDraft,
  onLoadDraft,
  onDeleteDraft,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[1px]">
      <div
        className="w-full max-w-md bg-white h-full border-l border-slate-200 flex flex-col"
        role="dialog"
        aria-label="貼文草稿紀錄"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-slate-900">
              草稿紀錄（本機儲存）
            </h2>
            <p className="text-xs text-slate-500 tabular-nums">
              共 {drafts.length} 份已儲存草稿
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉草稿面板"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
          <button
            type="button"
            onClick={onSaveCurrentAsDraft}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>將目前編輯內容存為新草稿</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {drafts.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <FolderOpen className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-medium text-slate-700">目前還沒有任何草稿</p>
              <p className="text-xs text-slate-500">
                點擊上方按鈕，可把照片設定、貼文與 Hashtag 暫存下來。
              </p>
            </div>
          ) : (
            drafts.map((draft) => {
              const spec = PLATFORMS[draft.platform];
              return (
                <div
                  key={draft.id}
                  className="border border-slate-200 rounded-xl p-3.5 hover:border-slate-300 transition-colors bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {draft.title || '未命名貼文草稿'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 tabular-nums">
                        <span>{spec.name}</span>
                        <span aria-hidden="true">·</span>
                        <span>{draft.photos.length} 張圖</span>
                        <span aria-hidden="true">·</span>
                        <span>{draft.hashtags.length} 個標籤</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteDraft(draft.id)}
                      aria-label="刪除草稿"
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {draft.caption && (
                    <p className="mt-2 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {draft.caption}
                    </p>
                  )}

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 tabular-nums">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(draft.updatedAt).toLocaleString('zh-TW')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onLoadDraft(draft);
                        onClose();
                      }}
                      className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      載入編輯
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
