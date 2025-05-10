// File: backend/src/controllers/aiController.ts
import { Request, Response, NextFunction } from 'express';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold
} from '@google/generative-ai';

const googleApiKey = process.env.GOOGLE_API_KEY;
const MODEL_NAME = 'gemini-1.5-flash-latest';

let genAI: GoogleGenerativeAI | null = null;
if (googleApiKey) {
  genAI = new GoogleGenerativeAI(googleApiKey);
} else {
  console.warn(
    '⚠️ WARNING: GOOGLE_API_KEY not set. AI features disabled.'
  );
}

// Определяем язык по первому слову
function detectLanguage(text: string): 'en' | 'ru' | 'kk' {
  const first = (text.trim().split(/\s+/)[0] || '').replace(/[^\p{L}]/gu, '');
  if (/^[A-Za-z]/.test(first)) return 'en';
  // буквы казахского алфавита
  if (/[ӘҒІҚҢӨҮҺәғіқңөүұ]/iu.test(first)) return 'kk';
  return 'ru';
}

export const getAiSuggestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { prompt, requestType } = req.body;

  if (!genAI) {
    return res
      .status(503)
      .json({ message: 'AI Service Unavailable: API key missing.' });
  }
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res
      .status(400)
      .json({ message: 'A non-empty prompt is required.' });
  }

  try {
    const lang = detectLanguage(prompt);
    const langPrefix = {
      en: 'The user is speaking English. Respond in English.',
      ru: 'Пользователь говорит на русском. Отвечай на русском.',
      kk: 'Пайдаланушы қазақша сөйлейді. Қазақша жауап беріңіз.'
    }[lang];

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const generationConfig = {
      temperature: 0.7,
      maxOutputTokens: 250
    };
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
      }
    ];

    const isGenerate = requestType === 'generateList';
    const baseInstr = isGenerate
      ? 'Generate a shopping list based on the user request; output only items, each on new line with bullet.'
      : 'Suggest relevant shopping list items or provide shopping-related advice, concise and clear.';

    const systemInstruction = `${langPrefix} ${baseInstr}`;
    const userPrompt = `Request: "${prompt.trim()}"`;

    const contents = [
      {
        role: 'user',
        parts: [{ text: `${systemInstruction}\n${userPrompt}` }]
      }
    ];

    const result = await model.generateContent({
      contents,
      generationConfig,
      safetySettings
    });

    if (!result.response) {
      throw new Error('No AI response');
    }
    if (result.response.promptFeedback?.blockReason) {
      return res.status(400).json({
        message: `Blocked: ${result.response.promptFeedback.blockReason}`
      });
    }

    let text = result.response.text().trim();
    if (isGenerate) {
      text = text
        .split('\n')
        .map((l) => l.replace(/^[-*]\s*/, '').trim())
        .filter((l) => l)
        .join('\n');
    }

    return res.json({ suggestion: text });
  } catch (err: any) {
    console.error('[AI Controller] Error:', err);
    next(err);
  }
};
