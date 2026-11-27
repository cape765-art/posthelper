import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Repeat2,
  Send,
} from 'lucide-react';
import {
  AspectRatioOption,
  HashtagPlacement,
  PLATFORMS,
  PlatformId,
  UploadedPhoto,
} from '../types/post';
import {
  SAMPLE_AVATAR_URL,
  formatFullPost,
  formatTagsOnly,
} from '../utils/auditRules';

interface LivePreviewCardProps {
  platform: PlatformId;
  photos: UploadedPhoto[];
  aspectRatio: AspectRatioOption;
  caption: string;
  hashtags: string[];
  hashtagPlacement: HashtagPlacement;
  location: string;
  mention: string;
}

const ASPECT_CLASS_MAP: Record<AspectRatioOption, string> = {
  '1:1': 'aspect-square',
  '4:5': 'aspect-[4/5]',
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16] max-h-[420px]',
};

export const LivePreviewCard: React.FC<LivePreviewCardProps> = ({
  platform,
  photos,
  aspectRatio,
  caption,
  hashtags,
  hashtagPlacement,
  location,
  mention,
}) => {
  const [slideIndex, setSlideIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (slideIndex >= photos.length) {
      setSlideIndex(Math.max(0, photos.length - 1));
    }
  }, [photos.length, slideIndex]);

  const spec = PLATFORMS[platform];
  const fullBody = formatFullPost(caption, hashtags, hashtagPlacement);
  const commentTags = hashtagPlacement === 'comment' ? formatTagsOnly(hashtags) : '';

  const needsFold = !expanded && fullBody.length > spec.foldChars;
  const displayedBody = needsFold
    ? fullBody.slice(0, spec.foldChars).trimEnd()
    : fullBody;

  const currentPhoto = photos[slideIndex];

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-800">
          {spec.name} 即時貼文預覽
        </span>
        <span className="text-xs text-slate-500 tabular-nums">
          比例 {aspectRatio} · {photos.length} 張圖
        </span>
      </div>

      {/* Simulated social card */}
      <div className="p-4">
        {/* Author row */}
        <div className="flex items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={SAMPLE_AVATAR_URL}
              alt="創作者頭像"
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
            />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 truncate">
                daily_creator_tw
              </div>
              {location.trim() ? (
                <div className="flex items-center gap-1 text-xs text-slate-500 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{location.trim()}</span>
                </div>
              ) : (
                <div className="text-xs text-slate-400">剛剛 · 公開</div>
              )}
            </div>
          </div>
          <span className="text-xs text-slate-400">{spec.shortName}</span>
        </div>

        {/* For Facebook / LinkedIn / Threads, text appears above media */}
        {(platform === 'facebook' || platform === 'linkedin' || platform === 'threads') && (
          <div className="pb-3 text-[13.5px] leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
            {displayedBody || (
              <span className="text-slate-400">
                貼文內容會即時呈現在這裡，方便確認換行與摺疊位置...
              </span>
            )}
            {needsFold && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="ml-1 text-slate-500 font-medium hover:text-slate-800 cursor-pointer"
              >
                ...顯示更多
              </button>
            )}
            {expanded && fullBody.length > spec.foldChars && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="block mt-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                收合全文
              </button>
            )}
          </div>
        )}

        {/* Photo frame */}
        <div
          className={`relative w-full overflow-hidden rounded-lg bg-slate-100 border border-slate-200/80 ${ASPECT_CLASS_MAP[aspectRatio]}`}
        >
          {currentPhoto ? (
            <>
              <img
                src={currentPhoto.dataUrl}
                alt={currentPhoto.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              {photos.length > 1 && (
                <>
                  <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 text-white text-[11px] font-medium tabular-nums">
                    {slideIndex + 1} / {photos.length}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSlideIndex((i) => Math.max(0, i - 1))}
                    disabled={slideIndex === 0}
                    aria-label="上一張照片"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 text-slate-800 flex items-center justify-center shadow-sm disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSlideIndex((i) => Math.min(photos.length - 1, i + 1))
                    }
                    disabled={slideIndex === photos.length - 1}
                    aria-label="下一張照片"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 text-slate-800 flex items-center justify-center shadow-sm disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center gap-2">
              <ImageIcon className="w-8 h-8 text-slate-300" />
              <span className="text-xs">尚未上傳照片，左側上傳後將顯示於此</span>
            </div>
          )}
        </div>

        {/* Simulated engagement bar */}
        <div className="pt-3 flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-4">
            <Heart className="w-5 h-5" />
            <MessageCircle className="w-5 h-5" />
            {platform === 'threads' ? (
              <Repeat2 className="w-5 h-5" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </div>
          <Bookmark className="w-5 h-5" />
        </div>

        {/* For Instagram / LINE VOOM, text appears below media */}
        {(platform === 'instagram' || platform === 'line') && (
          <div className="pt-2.5 text-[13.5px] leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
            <span className="font-semibold text-slate-900 mr-1.5">daily_creator_tw</span>
            {displayedBody || (
              <span className="text-slate-400">
                貼文內容會即時呈現在這裡，方便確認前兩行摺疊效果...
              </span>
            )}
            {needsFold && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="ml-1 text-slate-500 font-medium hover:text-slate-800 cursor-pointer"
              >
                ...更多
              </button>
            )}
            {expanded && fullBody.length > spec.foldChars && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="block mt-1 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                收合全文
              </button>
            )}
          </div>
        )}

        {/* Mention & comment hashtags preview */}
        {mention.trim() && (
          <div className="mt-2 text-xs text-blue-600">
            標註帳號：{mention.trim()}
          </div>
        )}

        {commentTags && (
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-medium text-slate-700">第一則留言（Hashtag）：</span>
            <span className="text-blue-600 break-words">{commentTags}</span>
          </div>
        )}
      </div>
    </div>
  );
};
