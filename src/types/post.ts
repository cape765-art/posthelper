export type PlatformId = 'instagram' | 'threads' | 'facebook' | 'linkedin' | 'line';

export type ToneId = 'lifestyle' | 'professional' | 'storytelling' | 'witty' | 'promotional';

export type AspectRatioOption = '1:1' | '4:5' | '16:9' | '9:16';

export type HashtagPlacement = 'inline' | 'spaced' | 'comment';

export interface PlatformSpec {
  id: PlatformId;
  name: string;
  shortName: string;
  maxChars: number;
  recommendedMin: number;
  recommendedMax: number;
  foldChars: number;
  idealHashtagsMin: number;
  idealHashtagsMax: number;
  maxHashtags: number;
  defaultAspect: AspectRatioOption;
  supportsAltText: boolean;
  supportsClickableLinkInBody: boolean;
  tip: string;
}

export interface ToneOption {
  id: ToneId;
  label: string;
  description: string;
}

export interface UploadedPhoto {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  base64: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export interface HashtagSuggestions {
  core: string[];
  niche: string[];
  local: string[];
}

export type AuditStatus = 'pass' | 'warning' | 'missing';

export interface DeterministicCheckItem {
  id: string;
  title: string;
  status: AuditStatus;
  statusLabel: string;
  detail: string;
  actionLabel?: string;
  actionType?: 'focus_photo' | 'focus_alt' | 'focus_caption' | 'focus_hashtag' | 'focus_meta' | 'add_cta_template';
}

export interface AiAuditFixAction {
  label: string;
  field: 'caption_append' | 'caption_prepend' | 'altText' | 'location' | 'hashtags';
  value: string;
}

export interface AiAuditFinding {
  status: AuditStatus;
  area: string;
  title: string;
  advice: string;
  fixAction?: AiAuditFixAction;
}

export interface AiAuditResult {
  summary: string;
  findings: AiAuditFinding[];
}

export interface DraftRecord {
  id: string;
  title: string;
  platform: PlatformId;
  tone: ToneId;
  topic: string;
  caption: string;
  hashtags: string[];
  hashtagPlacement: HashtagPlacement;
  altText: string;
  location: string;
  mention: string;
  linkNote: string;
  scheduledTime: string;
  aspectRatio: AspectRatioOption;
  photos: UploadedPhoto[];
  updatedAt: string;
}

export const PLATFORMS: Record<PlatformId, PlatformSpec> = {
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    shortName: 'IG',
    maxChars: 2200,
    recommendedMin: 80,
    recommendedMax: 500,
    foldChars: 90,
    idealHashtagsMin: 3,
    idealHashtagsMax: 8,
    maxHashtags: 30,
    defaultAspect: '4:5',
    supportsAltText: true,
    supportsClickableLinkInBody: false,
    tip: '前 90 字會決定讀者是否點擊「更多」，內文不可直接點擊網址。',
  },
  threads: {
    id: 'threads',
    name: 'Threads',
    shortName: 'Threads',
    maxChars: 500,
    recommendedMin: 30,
    recommendedMax: 260,
    foldChars: 500,
    idealHashtagsMin: 1,
    idealHashtagsMax: 3,
    maxHashtags: 5,
    defaultAspect: '4:5',
    supportsAltText: true,
    supportsClickableLinkInBody: true,
    tip: '語氣越自然口語越好，建議只放 1 個主題標籤，並用問句帶動討論。',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    shortName: 'FB',
    maxChars: 63206,
    recommendedMin: 60,
    recommendedMax: 450,
    foldChars: 140,
    idealHashtagsMin: 2,
    idealHashtagsMax: 5,
    maxHashtags: 10,
    defaultAspect: '4:5',
    supportsAltText: true,
    supportsClickableLinkInBody: true,
    tip: '連結常放第一則留言可維持觸及，前 3 行需清楚破題。',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    shortName: 'LinkedIn',
    maxChars: 3000,
    recommendedMin: 150,
    recommendedMax: 900,
    foldChars: 140,
    idealHashtagsMin: 3,
    idealHashtagsMax: 5,
    maxHashtags: 8,
    defaultAspect: '16:9',
    supportsAltText: true,
    supportsClickableLinkInBody: true,
    tip: '適合條列式觀點與實戰反思，結尾可邀請同業分享看法。',
  },
  line: {
    id: 'line',
    name: 'LINE VOOM',
    shortName: 'LINE',
    maxChars: 2000,
    recommendedMin: 40,
    recommendedMax: 300,
    foldChars: 110,
    idealHashtagsMin: 2,
    idealHashtagsMax: 5,
    maxHashtags: 10,
    defaultAspect: '1:1',
    supportsAltText: false,
    supportsClickableLinkInBody: true,
    tip: '適合直接給重點優惠、時間地點與清晰圖片，減少過長鋪陳。',
  },
};

export const TONES: ToneOption[] = [
  { id: 'lifestyle', label: '親切生活感', description: '自然分享日常觀察，拉近與追蹤者距離' },
  { id: 'professional', label: '專業乾貨型', description: '條理清晰、提供實用建議與具體觀點' },
  { id: 'storytelling', label: '故事敘事感', description: '從畫面細節切入情境，有溫度與畫面感' },
  { id: 'witty', label: '幽默有梗', description: '輕快反差、有記憶點，容易引發轉發共鳴' },
  { id: 'promotional', label: '活動與品牌推播', description: '亮點明確、強化價值主張與行動轉換' },
];
