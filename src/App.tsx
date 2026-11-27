import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookmarkPlus,
  Check,
  Copy,
  Download,
  RotateCcw,
  X,
} from 'lucide-react';
import { DraftsDrawer } from './components/DraftsDrawer';
import { HashtagStudio } from './components/HashtagStudio';
import { HeaderBar } from './components/HeaderBar';
import { LivePreviewCard } from './components/LivePreviewCard';
import { MissingCheckPanel } from './components/MissingCheckPanel';
import { PhotoUploader } from './components/PhotoUploader';
import { PostComposer } from './components/PostComposer';
import {
  AiAuditFixAction,
  AiAuditResult,
  AspectRatioOption,
  DeterministicCheckItem,
  DraftRecord,
  HashtagPlacement,
  HashtagSuggestions,
  PLATFORMS,
  PlatformId,
  ToneId,
  UploadedPhoto,
} from './types/post';
import {
  formatFullPost,
  formatTagsOnly,
  normalizeTag,
  runDeterministicAudit,
} from './utils/auditRules';

const DRAFTS_STORAGE_KEY = 'social_post_assistant_drafts_v1';

export default function App() {
  const [activeSection, setActiveSection] = useState<string>('step-photos');

  // Core post state
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('4:5');
  const [altText, setAltText] = useState('');
  const [platform, setPlatform] = useState<PlatformId>('instagram');
  const [tone, setTone] = useState<ToneId>('lifestyle');
  const [topic, setTopic] = useState('');
  const [caption, setCaption] = useState('');
  const [imageObservation, setImageObservation] = useState('');

  // Hashtag state
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagSuggestions, setHashtagSuggestions] = useState<HashtagSuggestions>({
    core: [],
    niche: [],
    local: [],
  });
  const [hashtagPlacement, setHashtagPlacement] = useState<HashtagPlacement>('spaced');

  // Metadata & reminders
  const [location, setLocation] = useState('');
  const [mention, setMention] = useState('');
  const [linkNote, setLinkNote] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  // AI loading & results
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isSuggestingTags, setIsSuggestingTags] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [aiReminders, setAiReminders] = useState<string[]>([]);
  const [aiAudit, setAiAudit] = useState<AiAuditResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedFull, setCopiedFull] = useState(false);

  // Drafts drawer
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftRecord[]>(() => {
    try {
      const raw = localStorage.getItem(DRAFTS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as DraftRecord[]) : [];
    } catch {
      return [];
    }
  });

  // Refs for quick jump actions from missing checks
  const altInputRef = useRef<HTMLInputElement | null>(null);
  const captionRef = useRef<HTMLTextAreaElement | null>(null);
  const hashtagInputRef = useRef<HTMLInputElement | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      // Ignore storage quota errors cleanly
    }
  }, [drafts]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2600);
  };

  const handleChangePlatform = (nextPlatform: PlatformId) => {
    setPlatform(nextPlatform);
    setAspectRatio(PLATFORMS[nextPlatform].defaultAspect);
    if (nextPlatform === 'threads') {
      setHashtagPlacement('inline');
    }
  };

  const scrollToSection = (sectionId: string) => {
    setActiveSection(sectionId);
    if (sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const deterministicChecks = useMemo(
    () =>
      runDeterministicAudit({
        platform,
        photos,
        caption,
        hashtags,
        altText,
        location,
        mention,
        linkNote,
        scheduledTime,
      }),
    [platform, photos, caption, hashtags, altText, location, mention, linkNote, scheduledTime]
  );

  const readyCount = deterministicChecks.filter((c) => c.status === 'pass').length;
  const missingCount = deterministicChecks.filter((c) => c.status === 'missing').length;

  const fullFormattedPost = useMemo(
    () => formatFullPost(caption, hashtags, hashtagPlacement),
    [caption, hashtags, hashtagPlacement]
  );

  const serializeImagesForApi = () =>
    photos.map((p) => ({
      mimeType: p.mimeType,
      data: p.base64,
    }));

  // 1. AI Generate full post + hashtags + alt text + initial missing tips
  const handleGeneratePost = async () => {
    if (photos.length === 0 && !topic.trim()) {
      setErrorMessage('請先在步驟 1 上傳至少一張照片，或輸入想分享的貼文主題。');
      return;
    }
    setErrorMessage(null);
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: serializeImagesForApi(),
          platform,
          tone,
          topic,
          existingLocation: location,
          existingMention: mention,
          existingLinkNote: linkNote,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '生成貼文失敗，請稍後再試。');
      }

      const assembledCaption = [data.hook, data.body, data.cta]
        .filter((part) => typeof part === 'string' && part.trim().length > 0)
        .join('\n\n');

      setCaption(assembledCaption);
      setImageObservation(data.imageObservation || '');
      if (data.altText && !altText.trim()) {
        setAltText(data.altText);
      }

      const nextSuggestions: HashtagSuggestions = {
        core: Array.isArray(data.hashtags?.core) ? data.hashtags.core.map(normalizeTag).filter(Boolean) : [],
        niche: Array.isArray(data.hashtags?.niche) ? data.hashtags.niche.map(normalizeTag).filter(Boolean) : [],
        local: Array.isArray(data.hashtags?.local) ? data.hashtags.local.map(normalizeTag).filter(Boolean) : [],
      };
      setHashtagSuggestions(nextSuggestions);

      // Auto-select ideal number of hashtags for chosen platform if user hasn't picked any yet
      if (hashtags.length === 0) {
        const spec = PLATFORMS[platform];
        const pool = [...nextSuggestions.core, ...nextSuggestions.niche, ...nextSuggestions.local];
        const uniquePool = Array.from(new Set(pool));
        setHashtags(uniquePool.slice(0, spec.idealHashtagsMax));
      }

      if (Array.isArray(data.missingReminders)) {
        setAiReminders(data.missingReminders);
      }
      setAiAudit(null);
      showToast('已根據照片與設定完成貼文與 Hashtag 初稿');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '生成貼文時發生錯誤');
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Refine caption
  const handleRefinePost = async (
    action: 'shorter' | 'vivid' | 'stronger_cta' | 'proofread' | 'threads_style'
  ) => {
    if (!caption.trim()) return;
    setErrorMessage(null);
    setIsRefining(true);
    try {
      const response = await fetch('/api/refine-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          action,
          platform,
          topic,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '潤飾貼文失敗');
      }
      if (data.caption) {
        setCaption(data.caption);
        showToast('已完成貼文潤飾');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '潤飾貼文時發生錯誤');
    } finally {
      setIsRefining(false);
    }
  };

  // 3. Suggest hashtags
  const handleSuggestHashtags = async () => {
    if (photos.length === 0 && !caption.trim() && !topic.trim()) {
      setErrorMessage('請先上傳照片或輸入一些貼文內容，AI 才能為您推薦精準的 Hashtag。');
      return;
    }
    setErrorMessage(null);
    setIsSuggestingTags(true);
    try {
      const response = await fetch('/api/suggest-hashtags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: serializeImagesForApi(),
          caption,
          topic,
          platform,
          existingHashtags: hashtags,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '推薦 Hashtag 失敗');
      }
      setHashtagSuggestions({
        core: Array.isArray(data.core) ? data.core.map(normalizeTag).filter(Boolean) : [],
        niche: Array.isArray(data.niche) ? data.niche.map(normalizeTag).filter(Boolean) : [],
        local: Array.isArray(data.local) ? data.local.map(normalizeTag).filter(Boolean) : [],
      });
      showToast('已更新推薦 Hashtag 清單');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '推薦 Hashtag 時發生錯誤');
    } finally {
      setIsSuggestingTags(false);
    }
  };

  // 4. Deep AI audit ("檢查還有缺漏甚麼")
  const handleRunAiAudit = async () => {
    if (photos.length === 0 && !caption.trim()) {
      setErrorMessage('請至少上傳照片或撰寫部分貼文後再執行深度缺漏健檢。');
      return;
    }
    setErrorMessage(null);
    setIsAuditing(true);
    try {
      const response = await fetch('/api/audit-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: serializeImagesForApi(),
          caption,
          hashtags,
          platform,
          altText,
          location,
          mention,
          linkNote,
          scheduledTime,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || '執行缺漏健檢失敗');
      }
      setAiAudit(data as AiAuditResult);
      showToast('已完成圖文缺漏深度健檢');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : '執行缺漏健檢時發生錯誤');
    } finally {
      setIsAuditing(false);
    }
  };

  // Apply quick fix from deterministic checklist
  const handleDeterministicQuickAction = (item: DeterministicCheckItem) => {
    switch (item.actionType) {
      case 'focus_photo':
        scrollToSection('step-photos');
        break;
      case 'focus_alt':
        scrollToSection('step-photos');
        setTimeout(() => altInputRef.current?.focus(), 350);
        break;
      case 'focus_caption':
        scrollToSection('step-caption');
        setTimeout(() => captionRef.current?.focus(), 350);
        break;
      case 'focus_hashtag':
        scrollToSection('step-hashtags');
        setTimeout(() => hashtagInputRef.current?.focus(), 350);
        break;
      case 'focus_meta':
        scrollToSection('step-caption');
        setTimeout(() => locationInputRef.current?.focus(), 350);
        break;
      case 'add_cta_template': {
        const ctaLine = '你也有類似的經驗或私藏名單嗎？歡迎在留言區跟我分享！';
        setCaption((prev) => (prev.trim() ? `${prev.trim()}\n\n${ctaLine}` : ctaLine));
        showToast('已在文末補上互動提問');
        break;
      }
      default:
        break;
    }
  };

  // Apply one-click AI fix
  const handleApplyAiFix = (fix: AiAuditFixAction) => {
    if (fix.field === 'caption_append') {
      setCaption((prev) => (prev.trim() ? `${prev.trim()}\n\n${fix.value}` : fix.value));
      showToast('已將建議內容補入貼文結尾');
    } else if (fix.field === 'caption_prepend') {
      setCaption((prev) => (prev.trim() ? `${fix.value}\n\n${prev.trim()}` : fix.value));
      showToast('已將建議內容補入貼文開頭');
    } else if (fix.field === 'altText') {
      setAltText(fix.value);
      showToast('已套用建議的圖片替代文字');
    } else if (fix.field === 'location') {
      setLocation(fix.value);
      showToast('已補入地點標記');
    } else if (fix.field === 'hashtags') {
      const incoming = fix.value
        .split(/[\s,，、]+/)
        .map(normalizeTag)
        .filter(Boolean);
      const existingLower = new Set(hashtags.map((t) => t.toLowerCase()));
      const merged = [...hashtags];
      for (const tag of incoming) {
        if (!existingLower.has(tag.toLowerCase())) {
          existingLower.add(tag.toLowerCase());
          merged.push(tag);
        }
      }
      setHashtags(merged);
      showToast('已補入建議 Hashtag');
    }
  };

  const handleCopyFullPost = async () => {
    if (!fullFormattedPost.trim()) return;
    await navigator.clipboard.writeText(fullFormattedPost);
    setCopiedFull(true);
    showToast(
      hashtagPlacement === 'comment' && hashtags.length > 0
        ? '已複製貼文本文（Hashtag 已設定另放留言區）'
        : '已複製完整貼文與 Hashtag'
    );
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const handleExportTxt = () => {
    const sections = [
      `【發布平台】${PLATFORMS[platform].name}`,
      scheduledTime ? `【預計發布】${scheduledTime.replace('T', ' ')}` : '',
      location ? `【地點標記】${location}` : '',
      mention ? `【標註帳號】${mention}` : '',
      linkNote ? `【導流連結】${linkNote}` : '',
      altText ? `【圖片替代文字】${altText}` : '',
      '',
      '【貼文完整內容】',
      fullFormattedPost || '（未填寫）',
      hashtagPlacement === 'comment' && hashtags.length > 0
        ? `\n【第一則留言 Hashtag】\n${formatTagsOnly(hashtags)}`
        : '',
    ]
      .filter((line) => line !== undefined)
      .join('\n');

    const blob = new Blob([sections], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `social-post-${platform}-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('已下載貼文檢核與文字檔');
  };

  const handleSaveDraft = () => {
    const titleSource = topic.trim() || caption.trim().split('\n')[0] || '未命名貼文草稿';
    const newDraft: DraftRecord = {
      id: `${Date.now()}`,
      title: titleSource.slice(0, 42),
      platform,
      tone,
      topic,
      caption,
      hashtags,
      hashtagPlacement,
      altText,
      location,
      mention,
      linkNote,
      scheduledTime,
      aspectRatio,
      photos: photos.slice(0, 3), // Keep localStorage footprint reasonable
      updatedAt: new Date().toISOString(),
    };
    setDrafts((prev) => [newDraft, ...prev].slice(0, 20));
    showToast('已儲存至草稿紀錄');
  };

  const handleLoadDraft = (draft: DraftRecord) => {
    setPlatform(draft.platform);
    setTone(draft.tone);
    setTopic(draft.topic);
    setCaption(draft.caption);
    setHashtags(draft.hashtags);
    setHashtagPlacement(draft.hashtagPlacement);
    setAltText(draft.altText);
    setLocation(draft.location);
    setMention(draft.mention);
    setLinkNote(draft.linkNote);
    setScheduledTime(draft.scheduledTime);
    setAspectRatio(draft.aspectRatio);
    setPhotos(draft.photos);
    setAiAudit(null);
    showToast('已載入草稿內容');
  };

  const handleResetAll = () => {
    setPhotos([]);
    setAltText('');
    setTopic('');
    setCaption('');
    setImageObservation('');
    setHashtags([]);
    setHashtagSuggestions({ core: [], niche: [], local: [] });
    setLocation('');
    setMention('');
    setLinkNote('');
    setScheduledTime('');
    setAiReminders([]);
    setAiAudit(null);
    setErrorMessage(null);
    showToast('已清空目前編輯區');
  };

  return (
    <div id="top" className="min-h-screen bg-[#F7F8FA] text-slate-900">
      <HeaderBar
        activeSection={activeSection}
        onNavigateSection={scrollToSection}
        onOpenDrafts={() => setIsDraftsOpen(true)}
        draftCount={drafts.length}
        onCopyFullPost={handleCopyFullPost}
        copiedFull={copiedFull}
        canCopy={Boolean(fullFormattedPost.trim())}
      />

      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-40 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-medium shadow-md flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8">
        {/* Page title & quick workspace utilities */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
              從照片到發布檢核，一站完成社群貼文
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              上傳照片後可自動看圖撰寫貼文與推薦 Hashtag，並隨時透過右側預覽與發布健檢確認還缺漏什麼細節。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookmarkPlus className="w-4 h-4 text-slate-500" />
              <span>存為草稿</span>
            </button>
            <button
              type="button"
              onClick={handleExportTxt}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>匯出文字檔</span>
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:text-red-600 hover:border-red-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>清空重填</span>
            </button>
          </div>
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 flex items-start justify-between gap-3 text-sm text-red-800"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              aria-label="關閉錯誤提示"
              className="p-0.5 text-red-500 hover:text-red-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Two-column workspace */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left column: 4-step workflow */}
          <div className="lg:col-span-7 space-y-6">
            <PhotoUploader
              photos={photos}
              onChangePhotos={setPhotos}
              aspectRatio={aspectRatio}
              onChangeAspectRatio={setAspectRatio}
              altText={altText}
              onChangeAltText={setAltText}
              altInputRef={altInputRef}
              onApplySamplePreset={(sampleAlt, sampleTopic) => {
                if (!altText.trim()) setAltText(sampleAlt);
                if (!topic.trim()) setTopic(sampleTopic);
              }}
            />

            <PostComposer
              platform={platform}
              onChangePlatform={handleChangePlatform}
              tone={tone}
              onChangeTone={setTone}
              topic={topic}
              onChangeTopic={setTopic}
              caption={caption}
              onChangeCaption={setCaption}
              imageObservation={imageObservation}
              location={location}
              onChangeLocation={setLocation}
              mention={mention}
              onChangeMention={setMention}
              linkNote={linkNote}
              onChangeLinkNote={setLinkNote}
              scheduledTime={scheduledTime}
              onChangeScheduledTime={setScheduledTime}
              onGeneratePost={handleGeneratePost}
              isGenerating={isGenerating}
              onRefinePost={handleRefinePost}
              isRefining={isRefining}
              captionRef={captionRef}
              locationInputRef={locationInputRef}
            />

            <HashtagStudio
              platform={platform}
              hashtags={hashtags}
              onChangeHashtags={setHashtags}
              suggestions={hashtagSuggestions}
              placement={hashtagPlacement}
              onChangePlacement={setHashtagPlacement}
              onRequestSuggestions={handleSuggestHashtags}
              isSuggesting={isSuggestingTags}
              hashtagInputRef={hashtagInputRef}
            />

            <MissingCheckPanel
              checks={deterministicChecks}
              onQuickAction={handleDeterministicQuickAction}
              aiAudit={aiAudit}
              aiReminders={aiReminders}
              onRunAiAudit={handleRunAiAudit}
              isAuditing={isAuditing}
              onApplyAiFix={handleApplyAiFix}
            />
          </div>

          {/* Right column: Sticky live preview & readiness summary */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
            {/* Compact readiness strip */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-medium text-slate-500">
                    發布前缺漏進度
                  </div>
                  <div className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">
                    {readyCount} / {deterministicChecks.length} 項已就緒
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => scrollToSection('step-audit')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {missingCount > 0 ? `查看 ${missingCount} 項缺漏` : '檢視完整體檢'}
                </button>
              </div>

              <div className="mt-3 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    missingCount === 0 ? 'bg-emerald-600' : 'bg-blue-600'
                  }`}
                  style={{
                    width: `${Math.round((readyCount / deterministicChecks.length) * 100)}%`,
                  }}
                />
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleCopyFullPost}
                  disabled={!fullFormattedPost.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  {copiedFull ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedFull ? '已複製完整貼文' : '複製完整貼文'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsDraftsOpen(true)}
                  className="px-3.5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
                >
                  草稿 ({drafts.length})
                </button>
              </div>
            </div>

            <LivePreviewCard
              platform={platform}
              photos={photos}
              aspectRatio={aspectRatio}
              caption={caption}
              hashtags={hashtags}
              hashtagPlacement={hashtagPlacement}
              location={location}
              mention={mention}
            />
          </aside>
        </div>
      </main>

      <DraftsDrawer
        isOpen={isDraftsOpen}
        onClose={() => setIsDraftsOpen(false)}
        drafts={drafts}
        onSaveCurrentAsDraft={handleSaveDraft}
        onLoadDraft={handleLoadDraft}
        onDeleteDraft={(id) => setDrafts((prev) => prev.filter((d) => d.id !== id))}
      />
    </div>
  );
}
