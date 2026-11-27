import {
  DeterministicCheckItem,
  HashtagPlacement,
  PLATFORMS,
  PlatformId,
  UploadedPhoto,
} from '../types/post';

export const SAMPLE_AVATAR_URL = '/src/assets/images/avatar_creator_profile_1795760827067.jpg';

export const SAMPLE_PHOTOS: Array<{ label: string; url: string; defaultAlt: string; defaultTopic: string }> = [
  {
    label: '早午餐咖啡日常',
    url: '/src/assets/images/sample_cafe_brunch_1795760826393.jpg',
    defaultAlt: '陽光灑落的大理石咖啡桌上放著一杯冰手沖咖啡與杏仁可頌',
    defaultTopic: '週末早晨的慢步調咖啡廳探店，推薦喜歡冰手沖與酥脆可頌的人',
  },
  {
    label: '極簡工作桌靈感',
    url: '/src/assets/images/sample_workspace_desk_1795760826697.jpg',
    defaultAlt: '淺木色桌面擺放著打開的手寫筆記本、鋼筆、復古相機與濃縮咖啡杯',
    defaultTopic: '分享平時整理創作靈感與拍攝前規劃的桌面工作流程',
  },
];

export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .replace(/[\s,，、;；]+/g, '')
    .slice(0, 40);
}

export function formatFullPost(
  caption: string,
  hashtags: string[],
  placement: HashtagPlacement
): string {
  const cleanCaption = caption.trim();
  const cleanTags = hashtags.map((t) => `#${normalizeTag(t)}`).filter((t) => t.length > 1);

  if (cleanTags.length === 0 || placement === 'comment') {
    return cleanCaption;
  }

  const tagBlock = cleanTags.join(' ');
  if (!cleanCaption) {
    return tagBlock;
  }

  if (placement === 'spaced') {
    return `${cleanCaption}\n\n.\n.\n${tagBlock}`;
  }

  return `${cleanCaption}\n\n${tagBlock}`;
}

export function formatTagsOnly(hashtags: string[]): string {
  return hashtags
    .map((t) => `#${normalizeTag(t)}`)
    .filter((t) => t.length > 1)
    .join(' ');
}

export async function compressImageFile(file: File, maxDimension = 1400): Promise<UploadedPhoto> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`無法讀取檔案 ${file.name}`));
    reader.readAsDataURL(file);
  });

  return processImageDataUrl(dataUrl, file.name, file.size, maxDimension);
}

export async function loadImageFromUrl(url: string, name: string): Promise<UploadedPhoto> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('無法載入範例圖片');
  }
  const blob = await response.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('圖片轉換失敗'));
    reader.readAsDataURL(blob);
  });
  return processImageDataUrl(dataUrl, name, blob.size, 1400);
}

async function processImageDataUrl(
  dataUrl: string,
  name: string,
  originalSize: number,
  maxDimension: number
): Promise<UploadedPhoto> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('圖片格式不支援或檔案已損毀'));
    image.src = dataUrl;
  });

  let targetWidth = img.naturalWidth || img.width;
  let targetHeight = img.naturalHeight || img.height;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    const scale = maxDimension / Math.max(targetWidth, targetHeight);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('瀏覽器不支援圖片處理');
  }
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const outputMime = 'image/jpeg';
  const compressedDataUrl = canvas.toDataURL(outputMime, 0.86);
  const base64 = compressedDataUrl.split(',')[1] || '';

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    mimeType: outputMime,
    dataUrl: compressedDataUrl,
    base64,
    width: targetWidth,
    height: targetHeight,
    sizeBytes: Math.round((base64.length * 3) / 4) || originalSize,
  };
}

export function runDeterministicAudit(params: {
  platform: PlatformId;
  photos: UploadedPhoto[];
  caption: string;
  hashtags: string[];
  altText: string;
  location: string;
  mention: string;
  linkNote: string;
  scheduledTime: string;
}): DeterministicCheckItem[] {
  const {
    platform,
    photos,
    caption,
    hashtags,
    altText,
    location,
    mention,
    linkNote,
    scheduledTime,
  } = params;

  const spec = PLATFORMS[platform];
  const trimmedCaption = caption.trim();
  const charCount = trimmedCaption.length;
  const lines = trimmedCaption ? trimmedCaption.split(/\n+/).map((l) => l.trim()).filter(Boolean) : [];
  const firstLine = lines[0] || '';

  const checks: DeterministicCheckItem[] = [];

  // 1. Photos check
  if (photos.length === 0) {
    checks.push({
      id: 'photos',
      title: '視覺照片素材',
      status: platform === 'threads' ? 'warning' : 'missing',
      statusLabel: platform === 'threads' ? '建議補齊' : '缺漏',
      detail:
        platform === 'threads'
          ? 'Threads 支援純文字，但搭配 1 張生活感圖片通常更能停住滑動目光。'
          : `尚未上傳照片，${spec.name} 貼文需要主視覺圖片才能獲得較佳觸及。`,
      actionLabel: '前往上傳照片',
      actionType: 'focus_photo',
    });
  } else {
    checks.push({
      id: 'photos',
      title: '視覺照片素材',
      status: 'pass',
      statusLabel: '已就緒',
      detail: `已準備 ${photos.length} 張照片（封面：${photos[0].width}×${photos[0].height}px）。`,
    });
  }

  // 2. Alt Text check
  if (spec.supportsAltText) {
    if (photos.length > 0 && !altText.trim()) {
      checks.push({
        id: 'alt_text',
        title: '圖片替代文字 (Alt Text)',
        status: 'missing',
        statusLabel: '缺漏',
        detail: '尚未填寫無障礙圖片描述，補上有助視障讀者理解並提升平台搜尋權重。',
        actionLabel: '填寫替代文字',
        actionType: 'focus_alt',
      });
    } else if (photos.length === 0) {
      checks.push({
        id: 'alt_text',
        title: '圖片替代文字 (Alt Text)',
        status: 'warning',
        statusLabel: '待上傳圖片',
        detail: '上傳照片後可填入圖片描述，或由 AI 自動產生。',
      });
    } else {
      checks.push({
        id: 'alt_text',
        title: '圖片替代文字 (Alt Text)',
        status: 'pass',
        statusLabel: '已就緒',
        detail: `已填入 ${altText.trim().length} 字圖片描述。`,
      });
    }
  }

  // 3. Opening hook check
  if (!trimmedCaption) {
    checks.push({
      id: 'hook',
      title: '首行吸睛開頭 (Hook)',
      status: 'missing',
      statusLabel: '缺漏',
      detail: '尚未撰寫貼文開頭，建議前兩行先拋出痛點、結論或好奇心。',
      actionLabel: '編輯貼文開頭',
      actionType: 'focus_caption',
    });
  } else if (firstLine.length > spec.foldChars) {
    checks.push({
      id: 'hook',
      title: '首行吸睛開頭 (Hook)',
      status: 'warning',
      statusLabel: '建議精簡',
      detail: `第一段共 ${firstLine.length} 字，超過 ${spec.name} 約 ${spec.foldChars} 字的摺疊線，建議提早換行。`,
      actionLabel: '調整開頭換行',
      actionType: 'focus_caption',
    });
  } else if (firstLine.length < 8) {
    checks.push({
      id: 'hook',
      title: '首行吸睛開頭 (Hook)',
      status: 'warning',
      statusLabel: '偏短',
      detail: '第一行字數較短，可補充能引起共鳴的情境或提問句。',
      actionLabel: '調整開頭',
      actionType: 'focus_caption',
    });
  } else {
    checks.push({
      id: 'hook',
      title: '首行吸睛開頭 (Hook)',
      status: 'pass',
      statusLabel: '已就緒',
      detail: `首行 ${firstLine.length} 字，能在「顯示更多」摺疊前完整呈現。`,
    });
  }

  // 4. Body length & formatting check
  if (charCount === 0) {
    checks.push({
      id: 'body',
      title: '內文篇幅與分段排版',
      status: 'missing',
      statusLabel: '缺漏',
      detail: '尚未撰寫貼文本文，可點擊「AI 看圖寫文」快速生成初稿。',
      actionLabel: '開始寫文',
      actionType: 'focus_caption',
    });
  } else if (charCount > spec.maxChars) {
    checks.push({
      id: 'body',
      title: '內文篇幅與分段排版',
      status: 'missing',
      statusLabel: '超過字數上限',
      detail: `目前 ${charCount} 字，已超出 ${spec.name} 上限 ${spec.maxChars} 字，發布會被截斷或無法送出。`,
      actionLabel: '前往精簡',
      actionType: 'focus_caption',
    });
  } else if (charCount < spec.recommendedMin) {
    checks.push({
      id: 'body',
      title: '內文篇幅與分段排版',
      status: 'warning',
      statusLabel: '內容偏短',
      detail: `目前 ${charCount} 字，${spec.name} 建議至少 ${spec.recommendedMin} 字以提供足夠故事或資訊量。`,
      actionLabel: '補充細節',
      actionType: 'focus_caption',
    });
  } else if (lines.length < 2 && charCount > 100) {
    checks.push({
      id: 'body',
      title: '內文篇幅與分段排版',
      status: 'warning',
      statusLabel: '缺乏分段',
      detail: '內文超過 100 字但沒有明顯段落留白，手機閱讀容易疲勞，建議每 2～3 句空一行。',
      actionLabel: '整理分段',
      actionType: 'focus_caption',
    });
  } else {
    checks.push({
      id: 'body',
      title: '內文篇幅與分段排版',
      status: 'pass',
      statusLabel: '已就緒',
      detail: `目前 ${charCount} 字 · 共 ${lines.length} 段，符合 ${spec.name} 閱讀節奏。`,
    });
  }

  // 5. CTA check
  const ctaPattern = /[？?]|留言|告訴我|分享|收藏|私訊|點擊|主頁|連結|試試|喜歡|推薦|覺得|哪一個|有沒有/;
  if (!trimmedCaption) {
    checks.push({
      id: 'cta',
      title: '互動行動呼籲 (CTA)',
      status: 'missing',
      statusLabel: '缺漏',
      detail: '貼文尚未撰寫，結尾記得保留提問或行動邀請。',
      actionLabel: '加入互動結尾',
      actionType: 'add_cta_template',
    });
  } else if (!ctaPattern.test(trimmedCaption.slice(-120))) {
    checks.push({
      id: 'cta',
      title: '互動行動呼籲 (CTA)',
      status: 'missing',
      statusLabel: '缺漏',
      detail: '文末沒有明顯的提問或引導動作（如留言、收藏、私訊），容易看完就滑走。',
      actionLabel: '一鍵加入互動提問',
      actionType: 'add_cta_template',
    });
  } else {
    checks.push({
      id: 'cta',
      title: '互動行動呼籲 (CTA)',
      status: 'pass',
      statusLabel: '已就緒',
      detail: '文末已包含提問或互動引導詞，有助提升留言與收藏率。',
    });
  }

  // 6. Hashtags check
  if (hashtags.length === 0) {
    checks.push({
      id: 'hashtags',
      title: 'Hashtag 標籤策略',
      status: 'missing',
      statusLabel: '缺漏',
      detail: `尚未加入任何 Hashtag，${spec.name} 建議配置 ${spec.idealHashtagsMin}～${spec.idealHashtagsMax} 個精準標籤。`,
      actionLabel: '前往新增標籤',
      actionType: 'focus_hashtag',
    });
  } else if (hashtags.length > spec.maxHashtags) {
    checks.push({
      id: 'hashtags',
      title: 'Hashtag 標籤策略',
      status: 'missing',
      statusLabel: '數量超標',
      detail: `目前已選 ${hashtags.length} 個標籤，超過 ${spec.name} 上限 ${spec.maxHashtags} 個。`,
      actionLabel: '精簡標籤',
      actionType: 'focus_hashtag',
    });
  } else if (
    hashtags.length < spec.idealHashtagsMin ||
    hashtags.length > spec.idealHashtagsMax
  ) {
    checks.push({
      id: 'hashtags',
      title: 'Hashtag 標籤策略',
      status: 'warning',
      statusLabel: '可微調數量',
      detail: `目前 ${hashtags.length} 個標籤，${spec.name} 最佳建議為 ${spec.idealHashtagsMin}～${spec.idealHashtagsMax} 個。`,
      actionLabel: '調整標籤',
      actionType: 'focus_hashtag',
    });
  } else {
    checks.push({
      id: 'hashtags',
      title: 'Hashtag 標籤策略',
      status: 'pass',
      statusLabel: '已就緒',
      detail: `已配置 ${hashtags.length} 個標籤，落在 ${spec.name} 最佳區間。`,
    });
  }

  // 7. Location / Mention context check
  if (!location.trim() && !mention.trim()) {
    checks.push({
      id: 'location_mention',
      title: '地點打卡與帳號標註',
      status: 'warning',
      statusLabel: '未填寫',
      detail: '若為探店、活動或品牌合作，建議補上打卡地點或 @合作帳號以增加曝光入口。',
      actionLabel: '補充地點或標註',
      actionType: 'focus_meta',
    });
  } else {
    const parts = [];
    if (location.trim()) parts.push(`地點：${location.trim()}`);
    if (mention.trim()) parts.push(`標註：${mention.trim()}`);
    checks.push({
      id: 'location_mention',
      title: '地點打卡與帳號標註',
      status: 'pass',
      statusLabel: '已就緒',
      detail: parts.join(' · '),
    });
  }

  // 8. Link / Schedule reminder
  const hasUrlInCaption = /https?:\/\//i.test(trimmedCaption);
  if (!spec.supportsClickableLinkInBody && hasUrlInCaption) {
    checks.push({
      id: 'link_schedule',
      title: '連結與排程檢查',
      status: 'missing',
      statusLabel: '連結無效風險',
      detail: 'Instagram 內文的網址無法直接點擊，建議改寫為「點擊主頁連結」並將網址記在連結備忘欄位。',
      actionLabel: '修正連結提示',
      actionType: 'focus_meta',
    });
  } else if (!scheduledTime.trim() && !linkNote.trim()) {
    checks.push({
      id: 'link_schedule',
      title: '連結與排程檢查',
      status: 'warning',
      statusLabel: '未設定排程',
      detail: '尚未記錄預計發布時間或導流連結（如無需導流可忽略）。',
      actionLabel: '設定排程備忘',
      actionType: 'focus_meta',
    });
  } else {
    const parts = [];
    if (scheduledTime.trim()) parts.push(`預計發布：${scheduledTime.replace('T', ' ')}`);
    if (linkNote.trim()) parts.push(`導流：${linkNote.trim()}`);
    checks.push({
      id: 'link_schedule',
      title: '連結與排程檢查',
      status: 'pass',
      statusLabel: '已就緒',
      detail: parts.join(' · '),
    });
  }

  return checks;
}
