import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const GEMINI_MODEL = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('尚未偵測到 GEMINI_API_KEY，請確認環境設定。');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ImageInput {
  mimeType: string;
  data: string;
}

function buildImageParts(images: ImageInput[] = []) {
  return images
    .filter((img) => img && img.data && img.mimeType)
    .slice(0, 6)
    .map((img) => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.data,
      },
    }));
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // 1. Analyze photos + topic and generate full post, hashtags, alt text, and missing items
  app.post('/api/generate-post', async (req, res) => {
    try {
      const {
        images = [],
        platform = 'instagram',
        tone = 'lifestyle',
        topic = '',
        existingLocation = '',
        existingMention = '',
        existingLinkNote = '',
      } = req.body as {
        images?: ImageInput[];
        platform?: string;
        tone?: string;
        topic?: string;
        existingLocation?: string;
        existingMention?: string;
        existingLinkNote?: string;
      };

      if (images.length === 0 && !topic.trim()) {
        res.status(400).json({
          error: '請先上傳至少一張照片，或輸入想分享的貼文主題。',
        });
        return;
      }

      const ai = getAiClient();
      const imageParts = buildImageParts(images);

      const promptText = `
請擔任資深台灣社群編輯與視覺內容顧問，使用繁體中文（台灣用語）完成以下任務：

目標平台：${platform}
期望語氣：${tone}
使用者提供的重點/構想：${topic.trim() || '（未填寫文字構想，請完全依據照片畫面發揮）'}
已填寫地點：${existingLocation || '無'}
已填寫標註帳號：${existingMention || '無'}
已填寫導流連結備忘：${existingLinkNote || '無'}

請根據照片細節（若有）與貼文需求，產出以下內容：
1. imageObservation：簡短描述你在照片中看到的關鍵視覺元素、光線氛圍或物件細節（若無照片請說明是純文字創作）。
2. hook：吸睛的第一段開頭（1～2 句，適合放在平台摺疊線之前，讓人想點開「顯示更多」）。
3. body：貼文主體段落，適度分段留白，語氣自然不油膩，避免過多空泛口號。
4. cta：文末互動號召或行動呼籲（例如提問邀請留言、提醒收藏或前往指定連結）。
5. altText：為照片撰寫 1 句具體且友善無障礙閱讀器的圖片替代文字（若無照片則留空字串）。
6. hashtags：分三組推薦（不要加 # 符號，直接給詞彙）：
   - core：3～4 個高搜尋度核心大標籤
   - niche：3～4 個精準主題/受眾標籤
   - local：2～3 個情境、地點或品牌延伸標籤
7. missingReminders：列出 2～4 個「根據這張照片與平台特性，發文前可能遺漏的細節」提醒（例如：照片裡有咖啡甜點但沒寫店名或地點、未說明購買/報名方式、Threads 建議精簡標籤等）。
`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
          parts: [...imageParts, { text: promptText }],
        },
        config: {
          systemInstruction:
            '你是一位專業、務實且重視排版與真實互動率的社群內容編輯。請使用自然流暢的台灣繁體中文，不堆砌浮誇表情符號，所有建議都必須具體可執行。',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              imageObservation: { type: Type.STRING },
              hook: { type: Type.STRING },
              body: { type: Type.STRING },
              cta: { type: Type.STRING },
              altText: { type: Type.STRING },
              hashtags: {
                type: Type.OBJECT,
                properties: {
                  core: { type: Type.ARRAY, items: { type: Type.STRING } },
                  niche: { type: Type.ARRAY, items: { type: Type.STRING } },
                  local: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['core', 'niche', 'local'],
              },
              missingReminders: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: [
              'imageObservation',
              'hook',
              'body',
              'cta',
              'altText',
              'hashtags',
              'missingReminders',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成貼文時發生錯誤';
      console.error('generate-post error:', error);
      res.status(500).json({ error: message });
    }
  });

  // 2. Refine / rewrite existing caption
  app.post('/api/refine-post', async (req, res) => {
    try {
      const { caption = '', action = 'proofread', platform = 'instagram', topic = '' } = req.body as {
        caption?: string;
        action?: 'shorter' | 'vivid' | 'stronger_cta' | 'proofread' | 'threads_style';
        platform?: string;
        topic?: string;
      };

      if (!caption.trim()) {
        res.status(400).json({ error: '目前沒有貼文內容可以潤飾。' });
        return;
      }

      const actionMap: Record<string, string> = {
        shorter: '精簡篇幅約 30%～40%，保留核心重點與開頭鉤子，讓手機閱讀更俐落。',
        vivid: '讓敘事與感官描寫更生動有畫面感，保留原本的意思與重點，不要過度誇張。',
        stronger_cta: '優化文末收尾與行動呼籲（CTA），加入自然有溫度的提問或明確引導，提升留言互動率。',
        proofread: '修正錯別字、標點符號、全半形空格與段落節奏，維持原作者語氣。',
        threads_style: '改寫為 Threads 適合的短文口語風格，控制在 220 字以內，有觀點或生活感。',
      };

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `目標平台：${platform}\n補充背景：${topic || '無'}\n執行任務：${actionMap[action] || actionMap.proofread}\n\n原始貼文內容（請勿在回傳中加入 hashtag，只回傳貼文本文）：\n${caption}`,
        config: {
          systemInstruction:
            '你是資深台灣繁體中文社群編輯。請直接輸出潤飾後的貼文本文，保留適當換行留白，不要加上多餘前言、引號或解釋。',
        },
      });

      res.json({ caption: (response.text ?? caption).trim() });
    } catch (error) {
      const message = error instanceof Error ? error.message : '潤飾貼文時發生錯誤';
      console.error('refine-post error:', error);
      res.status(500).json({ error: message });
    }
  });

  // 3. Suggest categorized hashtags based on photos and/or caption
  app.post('/api/suggest-hashtags', async (req, res) => {
    try {
      const {
        images = [],
        caption = '',
        topic = '',
        platform = 'instagram',
        existingHashtags = [],
      } = req.body as {
        images?: ImageInput[];
        caption?: string;
        topic?: string;
        platform?: string;
        existingHashtags?: string[];
      };

      if (images.length === 0 && !caption.trim() && !topic.trim()) {
        res.status(400).json({ error: '請先上傳照片或輸入部分貼文內容，AI 才能推薦精準標籤。' });
        return;
      }

      const ai = getAiClient();
      const imageParts = buildImageParts(images);

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
          parts: [
            ...imageParts,
            {
              text: `請針對目標平台「${platform}」與以下內容推薦不重複的繁體中文/英文常用 Hashtag（不要包含 # 符號）：\n貼文主題：${topic || '無'}\n貼文內文：${caption || '無'}\n目前已使用的標籤（請勿重複）：${existingHashtags.join(', ') || '無'}`,
            },
          ],
        },
        config: {
          systemInstruction:
            '你是一位精熟台灣社群搜尋趨勢的策略師。請回傳純 JSON，標籤文字不要含 # 符號或空白。',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              core: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 5 broad high-volume hashtags',
              },
              niche: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4 to 6 targeted topic or interest hashtags',
              },
              local: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 4 contextual, mood, or regional hashtags',
              },
            },
            required: ['core', 'niche', 'local'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : '推薦 Hashtag 時發生錯誤';
      console.error('suggest-hashtags error:', error);
      res.status(500).json({ error: message });
    }
  });

  // 4. Deep AI completeness & missing-element audit
  app.post('/api/audit-post', async (req, res) => {
    try {
      const {
        images = [],
        caption = '',
        hashtags = [],
        platform = 'instagram',
        altText = '',
        location = '',
        mention = '',
        linkNote = '',
        scheduledTime = '',
      } = req.body as {
        images?: ImageInput[];
        caption?: string;
        hashtags?: string[];
        platform?: string;
        altText?: string;
        location?: string;
        mention?: string;
        linkNote?: string;
        scheduledTime?: string;
      };

      const ai = getAiClient();
      const imageParts = buildImageParts(images);

      const auditPrompt = `
請對這篇準備發布的社群貼文進行嚴格的「發布前缺漏檢查」，比對照片畫面與目前文字內容，找出真實遺漏或能顯著提升成效的細節。

目前貼文狀態：
- 目標平台：${platform}
- 上傳照片數量：${images.length} 張
- 貼文內容：${caption.trim() || '（空白）'}
- 已選 Hashtag（${hashtags.length} 個）：${hashtags.map((t) => `#${t}`).join(' ') || '（無）'}
- 圖片替代文字 Alt Text：${altText.trim() || '（未填寫）'}
- 地點標記：${location.trim() || '（未填寫）'}
- 帳號標註 Mention：${mention.trim() || '（未填寫）'}
- 導流連結備忘：${linkNote.trim() || '（未填寫）'}
- 預計發布時間：${scheduledTime.trim() || '（未設定）'}

請檢查以下面向並回傳結構化診斷（4～6 項最關鍵的發現）：
1. 圖文關聯性：照片裡有出現的重要主體、產品、環境或情緒，貼文是否忘了提及或說明？
2. 讀者必要資訊（5W1H）：時間、地點、價格/取得方式、或主頁連結指引是否缺失？
3. 開頭吸引力與排版：前兩行是否太長或沒重點？
4. 互動號召 (CTA)：是否缺少給讀者的問題或下一步動作？
5. 無障礙與標籤策略：Alt Text 或 Hashtag 是否缺漏或與照片不符？

若某項目屬於「missing」或「warning」，而且可以直接靠文字補齊，請務必提供 fixAction（包含 label, field, value），讓使用者一鍵套用補齊！
`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: {
          parts: [...imageParts, { text: auditPrompt }],
        },
        config: {
          systemInstruction:
            '你是嚴謹但實用的社群主編，專注檢查貼文在「發布前還缺什麼」。請用台灣繁體中文回答，具體指出圖文落差與可立即補齊的建議。',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'One concise sentence summarizing overall readiness and biggest missing item.',
              },
              findings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    status: {
                      type: Type.STRING,
                      enum: ['pass', 'warning', 'missing'],
                    },
                    area: { type: Type.STRING },
                    title: { type: Type.STRING },
                    advice: { type: Type.STRING },
                    fixAction: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        field: {
                          type: Type.STRING,
                          enum: ['caption_append', 'caption_prepend', 'altText', 'location', 'hashtags'],
                        },
                        value: { type: Type.STRING },
                      },
                      required: ['label', 'field', 'value'],
                    },
                  },
                  required: ['status', 'area', 'title', 'advice'],
                },
              },
            },
            required: ['summary', 'findings'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : '執行缺漏健檢時發生錯誤';
      console.error('audit-post error:', error);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
