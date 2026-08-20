import { transcribe, type TranscriptionResult } from 'ai';
import { createCartesia } from '@ai-sdk/cartesia';
import { createDeepgram } from '@ai-sdk/deepgram';
import { createElevenLabs } from '@ai-sdk/elevenlabs';
import { createGroq } from '@ai-sdk/groq';
import { createOpenAI } from '@ai-sdk/openai';

import { proxyDispatcher } from '../outbound-proxy.ts';
import { versionedApiBaseUrl } from './media-provider-config.ts';

import type {
  CloudTranscriptionProvider,
  CloudTranscriptionRequest,
  NormalizedTranscriptResult,
  NormalizedTranscriptUtterance,
  NormalizedTranscriptWord,
  TranscriptionOptions,
} from './transcription-types.ts';

export class TranscriptionConfigurationError extends Error {}

function requireProviderKey(options: TranscriptionOptions, provider: CloudTranscriptionProvider): string {
  if (provider === 'cartesia' && /^ink-2(?:-|$)/i.test(options.cartesiaModel)) {
    throw new TranscriptionConfigurationError(
      'Cartesia ink-2 is streaming-only; use ink-whisper for batch transcription',
    );
  }
  const key = provider === 'openai' ? options.openaiApiKey
    : provider === 'mistral' ? options.mistralApiKey
      : provider === 'deepgram' ? options.deepgramApiKey
        : provider === 'groq' ? options.groqApiKey
          : provider === 'elevenlabs' ? options.elevenApiKey
            : provider === 'gemini' ? options.geminiApiKey
              : options.cartesiaApiKey;
  if (key) return key;
  const label = provider === 'elevenlabs' ? 'ElevenLabs' : provider[0]!.toUpperCase() + provider.slice(1);
  throw new TranscriptionConfigurationError(`${label} API key is not configured`);
}

export function assertTranscriptionProviderConfigured(
  options: TranscriptionOptions,
  provider: CloudTranscriptionProvider,
): void {
  requireProviderKey(options, provider);
}

async function runProvider(options: TranscriptionOptions, request: CloudTranscriptionRequest) {
  const key = requireProviderKey(options, request.provider);
  const common = { audio: request.audio, maxRetries: 1 } as const;
  if (request.provider === 'openai') return transcribe({ ...common,
    model: createOpenAI({ apiKey: key, baseURL: versionedApiBaseUrl(options.openaiBaseUrl, 'v1') }).transcription(options.openaiModel),
    providerOptions: { openai: { ...(request.language === 'auto' ? {} : { language: request.language }),
      timestampGranularities: ['word', 'segment'] } },
  });
  if (request.provider === 'mistral') return transcribe({ ...common,
    model: createOpenAI({ apiKey: key, baseURL: versionedApiBaseUrl(options.mistralBaseUrl, 'v1') })
      .transcription(options.mistralModel),
    providerOptions: { openai: { ...(request.language === 'auto' ? {} : { language: request.language }),
      timestampGranularities: ['word', 'segment'] } },
  });
  if (request.provider === 'deepgram') return transcribe({ ...common,
    model: createDeepgram({ apiKey: key }).transcription(options.deepgramModel),
    providerOptions: { deepgram: { ...(request.language === 'auto' ? { detectLanguage: true } : { language: request.language }),
      smartFormat: true, punctuate: true, diarize: request.diarize, utterances: true } },
  });
  if (request.provider === 'groq') return transcribe({ ...common,
    model: createGroq({ apiKey: key, baseURL: options.groqBaseUrl }).transcription(options.groqModel),
    providerOptions: { groq: { ...(request.language === 'auto' ? {} : { language: request.language }),
      responseFormat: 'verbose_json', timestampGranularities: ['word'] } },
  });
  if (request.provider === 'elevenlabs') return transcribe({ ...common,
    model: createElevenLabs({ apiKey: key }).transcription(options.elevenModel),
    providerOptions: { elevenlabs: { ...(request.language === 'auto' ? {} : { languageCode: request.language }),
      diarize: request.diarize, timestampsGranularity: 'word' } },
  });
  if (request.provider === 'gemini') return transcribeGemini(options, request, key);
  return transcribe({ ...common,
    model: createCartesia({ apiKey: key }).transcription(options.cartesiaModel),
    providerOptions: { cartesia: { ...(request.language === 'auto' ? {} : { language: request.language }),
      timestampGranularities: ['word'] } },
  });
}

function record(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function at(value: unknown, ...path: Array<string | number>): unknown {
  let current = value;
  for (const part of path) {
    if (typeof part === 'number') current = Array.isArray(current) ? current[part] : undefined;
    else current = record(current)?.[part];
  }
  return current;
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function rawWordList(provider: CloudTranscriptionProvider, raw: unknown): unknown[] {
  if (provider === 'deepgram') return array(at(raw, 'results', 'channels', 0, 'alternatives', 0, 'words'));
  if (provider === 'elevenlabs' || provider === 'cartesia') return array(at(raw, 'words'));
  const words = array(at(raw, 'words'));
  return words.length ? words : array(at(raw, 'segments'));
}

function milliseconds(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value * 1000)) : null;
}

function normalizedRawWords(provider: CloudTranscriptionProvider, raw: unknown): NormalizedTranscriptWord[] {
  const words: NormalizedTranscriptWord[] = [];
  for (const value of rawWordList(provider, raw)) {
    const item = record(value);
    if (!item || (provider === 'elevenlabs' && item.type !== 'word')) continue;
    const textValue = item.punctuated_word ?? item.text ?? item.word;
    const start = milliseconds(item.start);
    const end = milliseconds(item.end);
    if (typeof textValue !== 'string' || !textValue.trim() || start == null || end == null) continue;
    const speakerValue = item.speaker_id ?? item.speaker;
    words.push({ text: textValue.trim(), start, end: Math.max(start, end),
      speaker: typeof speakerValue === 'string' || typeof speakerValue === 'number' ? String(speakerValue) : null });
  }
  return words;
}

function standardWords(result: TranscriptionResult): NormalizedTranscriptWord[] {
  return result.segments.flatMap((segment) => {
    const start = milliseconds(segment.startSecond);
    const end = milliseconds(segment.endSecond);
    return start == null || end == null || !segment.text.trim() ? [] : [{
      text: segment.text.trim(), start, end: Math.max(start, end), speaker: null,
    }];
  });
}

function joinedText(words: NormalizedTranscriptWord[]): string {
  return words.map((word) => word.text).join(' ')
    .replace(/\s+([,.;:!?，。；：！？])/gu, '$1')
    .replace(/([（(])\s+/gu, '$1');
}

function groupUtterances(words: NormalizedTranscriptWord[]): NormalizedTranscriptUtterance[] {
  const utterances: NormalizedTranscriptUtterance[] = [];
  let current: NormalizedTranscriptWord[] = [];
  const flush = () => {
    if (!current.length || current[0]!.speaker == null) return;
    utterances.push({ speaker: current[0]!.speaker!, text: joinedText(current), start: current[0]!.start,
      end: current[current.length - 1]!.end, words: current });
    current = [];
  };
  for (const word of words) {
    if (word.speaker == null) { flush(); continue; }
    if (current.length && current[0]!.speaker !== word.speaker) flush();
    current.push(word);
  }
  flush();
  return utterances;
}

/** Gemini native audio transcription — sends audio as inline data with a
 * transcription prompt. Returns a TranscriptionResult-compatible shape so
 * the rest of the pipeline (word normalization, utterance grouping) works
 * unchanged. Gemini does not provide word-level timestamps, so we return
 * segment-level data only. */
async function transcribeGemini(
  options: TranscriptionOptions,
  request: CloudTranscriptionRequest,
  apiKey: string,
): Promise<TranscriptionResult> {
  const audioBase64 = Buffer.from(request.audio).toString('base64');
  const languageInstruction = request.language === 'auto'
    ? 'Transcribe this audio exactly in whatever language it is spoken. Return only the transcribed text, nothing else.'
    : `Transcribe this audio exactly in ${request.language}. Return only the transcribed text, nothing else.`;

  const baseUrl = options.geminiBaseUrl.replace(/\/+$/, '');
  const model = options.geminiModel;
  type FetchInit = Parameters<typeof fetch>[1] & { dispatcher?: unknown };
  const fetchWithProxy = (url: RequestInfo | URL, init?: FetchInit): Promise<Response> =>
    fetch(url, { ...init, dispatcher: proxyDispatcher() } as RequestInit);

  const response = await fetchWithProxy(
    `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: languageInstruction },
            { inline_data: { mime_type: 'audio/wav', data: audioBase64 } },
          ],
        }],
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Gemini transcription failed (${response.status}): ${errorBody.slice(0, 300)}`);
  }

  const result = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  if (!text.trim()) throw new Error('Gemini returned an empty transcription');

  // Gemini doesn't provide timestamps — return a single segment spanning the
  // full audio. The caller will use this as segment-level data.
  return {
    text,
    segments: [{ text: text.trim(), startSecond: 0, endSecond: 0 }],
    language: undefined,
    durationInSeconds: undefined,
    warnings: [],
    responses: [{ body: { words: [], segments: [{ text: text.trim(), start: 0, end: 0 }] } }] as unknown as TranscriptionResult['responses'],
    providerMetadata: {},
  } satisfies TranscriptionResult;
}

export async function transcribeCloudAudio(
  options: TranscriptionOptions,
  request: CloudTranscriptionRequest,
): Promise<NormalizedTranscriptResult> {
  const result = await runProvider(options, request);
  const raw = (result.responses[0] as unknown as { body?: unknown } | undefined)?.body;
  const providerWords = normalizedRawWords(request.provider, raw);
  const words = providerWords.length ? providerWords : standardWords(result);
  return { text: result.text, words, utterances: groupUtterances(words) };
}
