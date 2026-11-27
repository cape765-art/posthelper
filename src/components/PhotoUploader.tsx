import React, { useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import { AspectRatioOption, UploadedPhoto } from '../types/post';
import {
  SAMPLE_PHOTOS,
  compressImageFile,
  loadImageFromUrl,
} from '../utils/auditRules';

interface PhotoUploaderProps {
  photos: UploadedPhoto[];
  onChangePhotos: (photos: UploadedPhoto[]) => void;
  aspectRatio: AspectRatioOption;
  onChangeAspectRatio: (ratio: AspectRatioOption) => void;
  altText: string;
  onChangeAltText: (val: string) => void;
  onApplySamplePreset?: (altText: string, topic: string) => void;
  altInputRef?: React.RefObject<HTMLInputElement | null>;
}

const ASPECT_OPTIONS: Array<{ value: AspectRatioOption; label: string }> = [
  { value: '1:1', label: '1:1 正方' },
  { value: '4:5', label: '4:5 直式' },
  { value: '16:9', label: '16:9 橫式' },
  { value: '9:16', label: '9:16 滿版' },
];

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photos,
  onChangePhotos,
  aspectRatio,
  onChangeAspectRatio,
  altText,
  onChangeAltText,
  onApplySamplePreset,
  altInputRef,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);
    setIsProcessing(true);
    try {
      const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
      if (files.length === 0) {
        setUploadError('請選擇 JPG、PNG 或 WebP 格式的照片檔案。');
        return;
      }
      const remainingSlots = Math.max(0, 6 - photos.length);
      const selected = files.slice(0, remainingSlots);
      const compressed = await Promise.all(selected.map((file) => compressImageFile(file)));
      onChangePhotos([...photos, ...compressed]);
      if (files.length > remainingSlots) {
        setUploadError('最多支援同時上傳 6 張照片，已自動保留前 6 張。');
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '照片處理失敗，請重新選擇。');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLoadSample = async (sample: (typeof SAMPLE_PHOTOS)[number]) => {
    if (photos.length >= 6) {
      setUploadError('最多可上傳 6 張照片，請先移除一張再試。');
      return;
    }
    setUploadError(null);
    setIsProcessing(true);
    try {
      const photo = await loadImageFromUrl(sample.url, `${sample.label}.jpg`);
      onChangePhotos([...photos, photo]);
      if (onApplySamplePreset) {
        onApplySamplePreset(sample.defaultAlt, sample.defaultTopic);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '載入範例照片失敗');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChangePhotos(next);
  };

  const handleSetCover = (index: number) => {
    if (index === 0) return;
    const next = [...photos];
    const [item] = next.splice(index, 1);
    next.unshift(item);
    onChangePhotos(next);
  };

  const handleRemove = (id: string) => {
    onChangePhotos(photos.filter((p) => p.id !== id));
  };

  return (
    <section
      id="step-photos"
      className="bg-white border border-slate-200 rounded-xl p-6 scroll-mt-20"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-900">
            01. 上傳照片與裁切比例
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            支援拖曳多張照片（最多 6 張），第一張將作為貼文首圖封面。
          </p>
        </div>

        {/* Aspect ratio segmented control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {ASPECT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChangeAspectRatio(opt.value)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                aspectRatio === opt.value
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`mt-5 rounded-xl border-2 border-dashed transition-colors p-6 text-center ${
          isDragging
            ? 'border-blue-600 bg-blue-50/50'
            : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-700">
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-800">
              拖曳照片至此處，或點擊按鈕選取圖片
            </p>
            <p className="text-xs text-slate-500 tabular-nums">
              支援 JPG / PNG / WebP · 已上傳 {photos.length} / 6 張
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing || photos.length >= 6}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ImagePlus className="w-4 h-4" />
              <span>選擇照片檔案</span>
            </button>

            {SAMPLE_PHOTOS.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => handleLoadSample(sample)}
                disabled={isProcessing || photos.length >= 6}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                試用範例：{sample.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {uploadError && (
        <p className="mt-3 text-xs font-medium text-red-600" role="alert">
          {uploadError}
        </p>
      )}

      {/* Uploaded thumbnails grid */}
      {photos.length > 0 && (
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className="group relative border border-slate-200 rounded-lg overflow-hidden bg-slate-50"
            >
              <div className="aspect-square w-full overflow-hidden bg-slate-100">
                <img
                  src={photo.dataUrl}
                  alt={photo.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="px-2.5 py-2 bg-white border-t border-slate-100 flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-800 truncate tabular-nums">
                    {index === 0 ? '封面圖 · 第 1 張' : `第 ${index + 1} 張`}
                  </div>
                  <div className="text-[11px] text-slate-400 tabular-nums">
                    {photo.width}×{photo.height}
                  </div>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSetCover(index)}
                      title="設為首圖"
                      className="px-1.5 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                    >
                      首圖
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0}
                    aria-label="往前移"
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === photos.length - 1}
                    aria-label="往後移"
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 rounded cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(photo.id)}
                    aria-label="移除照片"
                    className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alt text field */}
      <div className="mt-5 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label htmlFor="alt-text-input" className="text-sm font-medium text-slate-800">
            圖片替代文字（Alt Text）
          </label>
          <span className="text-xs text-slate-400">協助無障礙閱讀與社群搜尋索引</span>
        </div>
        <input
          ref={altInputRef}
          id="alt-text-input"
          type="text"
          value={altText}
          onChange={(e) => onChangeAltText(e.target.value)}
          placeholder="例如：陽光灑落的大理石咖啡桌上放著一杯冰手沖咖啡與杏仁可頌"
          className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
        />
      </div>
    </section>
  );
};
