import { GEMINI_TEXT_MODELS, parseModelJson } from './gemini-json';

export type ModelProvider = 'openai' | 'gemini';

type StructuredGenerationOptions<T> = {
  name: string;
  prompt: string;
  schema: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  file?: { name: string; mimeType: string; data: string };
  validate?: (value: T) => boolean;
};

type StructuredGenerationResult<T> = {
  value: T;
  provider: ModelProvider;
  model: string;
  usage: ModelUsage;
};

export type ModelUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

function isConfiguredKey(value: string | undefined) {
  const key = value?.trim();
  return Boolean(key && !/^your_/i.test(key));
}

function requestedProvider() {
  const value = (process.env.OCULAR_AI_PROVIDER || 'auto').trim().toLowerCase();
  return value === 'openai' || value === 'gemini' ? value : 'auto';
}

export function configuredProviderOrder(): ModelProvider[] {
  const requested = requestedProvider();
  const available: ModelProvider[] = [];
  if (isConfiguredKey(process.env.OPENAI_API_KEY)) available.push('openai');
  if (isConfiguredKey(process.env.GEMINI_API_KEY)) available.push('gemini');
  if (requested === 'auto') return available;
  return available.filter((provider) => provider === requested);
}

export function hasConfiguredModelProvider() {
  return configuredProviderOrder().length > 0;
}

function toOpenAiJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toOpenAiJsonSchema);
  if (!value || typeof value !== 'object') return value;

  const source = value as Record<string, unknown>;
  const converted: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(source)) {
    if (key === 'type' && typeof item === 'string') {
      converted.type = item.toLowerCase();
    } else {
      converted[key] = toOpenAiJsonSchema(item);
    }
  }
  if (converted.type === 'object') converted.additionalProperties = false;
  return converted;
}

function openAiOutputText(payload: {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
}) {
  if (payload.output_text) return payload.output_text;
  return (payload.output || [])
    .flatMap((item) => item.content || [])
    .filter((item) => item.type === 'output_text')
    .map((item) => item.text || '')
    .join('');
}

async function generateWithOpenAi<T>(
  options: StructuredGenerationOptions<T>,
): Promise<StructuredGenerationResult<T>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_NOT_CONFIGURED');
  const model = process.env.OPENAI_MODEL || 'gpt-5.2';
  const content: Array<Record<string, unknown>> = [
    { type: 'input_text', text: options.prompt },
  ];
  if (options.file) {
    content.push({
      type: 'input_file',
      filename: options.file.name,
      file_data: `data:${options.file.mimeType || 'application/pdf'};base64,${options.file.data}`,
    });
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [{ role: 'user', content }],
      max_output_tokens: options.maxOutputTokens || 16384,
      store: false,
      text: {
        format: {
          type: 'json_schema',
          name: options.name,
          strict: true,
          schema: toOpenAiJsonSchema(options.schema),
        },
      },
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      'OpenAI structured generation failed',
      model,
      response.status,
      errorBody.slice(0, 300),
    );
    throw new Error(`OPENAI_${response.status}`);
  }

  const payload = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      total_tokens?: number;
    };
  };
  const text = openAiOutputText(payload);
  if (!text) throw new Error('OPENAI_EMPTY_OUTPUT');
  const value = parseModelJson<T>(text);
  if (options.validate && !options.validate(value))
    throw new Error('OPENAI_OUTPUT_CONTRACT');
  return {
    value,
    provider: 'openai',
    model,
    usage: {
      inputTokens: payload.usage?.input_tokens || 0,
      outputTokens: payload.usage?.output_tokens || 0,
      totalTokens: payload.usage?.total_tokens || 0,
    },
  };
}

async function generateWithGemini<T>(
  options: StructuredGenerationOptions<T>,
): Promise<StructuredGenerationResult<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_NOT_CONFIGURED');
  const parts: Array<Record<string, unknown>> = [{ text: options.prompt }];
  if (options.file) {
    parts.push({
      inlineData: {
        mimeType: options.file.mimeType || 'application/pdf',
        data: options.file.data,
      },
    });
  }

  for (const model of GEMINI_TEXT_MODELS) {
    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              temperature: options.temperature ?? 0.4,
              maxOutputTokens: options.maxOutputTokens || 16384,
              responseMimeType: 'application/json',
              responseSchema: options.schema,
            },
          }),
          signal: AbortSignal.timeout(45_000),
        },
      );
    } catch (error) {
      console.error(
        'Gemini structured generation did not complete',
        model,
        error,
      );
      continue;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(
        'Gemini structured generation failed',
        model,
        response.status,
        errorBody.slice(0, 300),
      );
      if (response.status !== 429 && response.status !== 503) break;
      continue;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) continue;
    try {
      const value = parseModelJson<T>(text);
      if (options.validate && !options.validate(value)) {
        console.error(
          'Gemini output did not satisfy the structured contract',
          model,
        );
        continue;
      }
      return {
        value,
        provider: 'gemini',
        model,
        usage: {
          inputTokens: payload.usageMetadata?.promptTokenCount || 0,
          outputTokens: payload.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: payload.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error) {
      console.error('Gemini structured JSON was invalid', model, error);
    }
  }

  throw new Error('GEMINI_GENERATION_FAILED');
}

export async function generateStructuredJson<T>(
  options: StructuredGenerationOptions<T>,
): Promise<StructuredGenerationResult<T>> {
  const providers = configuredProviderOrder();
  if (!providers.length) throw new Error('MODEL_PROVIDER_NOT_CONFIGURED');

  let lastError: unknown;
  for (const provider of providers) {
    try {
      return provider === 'openai'
        ? await generateWithOpenAi(options)
        : await generateWithGemini(options);
    } catch (error) {
      lastError = error;
      console.error(
        `${provider} provider could not complete structured generation`,
        error,
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('MODEL_GENERATION_FAILED');
}
