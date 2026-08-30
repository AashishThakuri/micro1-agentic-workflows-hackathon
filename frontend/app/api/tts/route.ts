function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function pcmToWave(pcm: Uint8Array, sampleRate = 24000) {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + pcm.byteLength, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, pcm.byteLength, true);

  const wave = new Uint8Array(44 + pcm.byteLength);
  wave.set(new Uint8Array(header), 0);
  wave.set(pcm, 44);
  return wave;
}

function retryDelaySeconds(response: Response, errorBody: string) {
  const headerValue = Number(response.headers.get("Retry-After"));
  if (Number.isFinite(headerValue) && headerValue > 0) return Math.ceil(headerValue);
  const messageMatch = errorBody.match(/retry in\s+([\d.]+)s/i);
  if (messageMatch) return Math.max(1, Math.ceil(Number(messageMatch[1])));
  const detailMatch = errorBody.match(/"retryDelay"\s*:\s*"([\d.]+)s"/i);
  if (detailMatch) return Math.max(1, Math.ceil(Number(detailMatch[1])));
  return 7;
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

let narrationQueue: Promise<void> = Promise.resolve();
let lastGeminiRequestAt = 0;

async function paceGeminiRequest() {
  const remaining = 6500 - (Date.now() - lastGeminiRequestAt);
  if (remaining > 0) await wait(remaining);
  lastGeminiRequestAt = Date.now();
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: "Narration is not configured." }, { status: 503 });

  const input = (await request.json()) as { text?: string; title?: string };
  const narration = input.text?.trim();
  if (!narration) return Response.json({ error: "Narration text is required." }, { status: 400 });

  const prompt = [
    "You are Ocular's single permanent educational narrator.",
    "Keep exactly the same warm, clear, thoughtful identity, pace, energy, pronunciation style, and emotional restraint in every scene.",
    "Speak naturally at a measured pace. Do not add, remove, or paraphrase information.",
    input.title ? `Scene title: ${input.title}.` : "",
    narration,
  ].filter(Boolean).join("\n");

  const model = process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview";
  const task = narrationQueue.then(async () => {
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        await paceGeminiRequest();
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
                },
              },
            }),
          },
        );

        if (response.ok) {
          const payload = (await response.json()) as {
            candidates?: Array<{
              content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
            }>;
          };
          const data = payload.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (data) {
            const pcm = decodeBase64(data);
            const wave = pcmToWave(pcm);
            return new Response(wave, {
              headers: {
                "Content-Type": "audio/wav",
                "Cache-Control": "private, no-store",
                "X-Audio-Duration": String(pcm.byteLength / 48000),
              },
            });
          }
          return Response.json({ error: "Gemini returned no narration audio." }, { status: 502 });
        }

        const errorBody = await response.text();
        console.error("Gemini narration request failed", model, response.status, errorBody.slice(0, 500));
        const retryable = response.status === 429 || response.status === 503;
        const retryAfter = response.status === 429 ? retryDelaySeconds(response, errorBody) : 7;
        if (retryable && attempt < 2) {
          await wait(Math.min(59, retryAfter) * 1000);
          continue;
        }
        if (response.status === 429) {
          return Response.json(
            { error: "The free Gemini narration quota is cooling down.", retryAfterSeconds: retryAfter },
            { status: 429, headers: { "Retry-After": String(retryAfter) } },
          );
        }
        if (response.status === 503) {
          return Response.json(
            { error: "Gemini narration is temporarily busy.", retryAfterSeconds: retryAfter },
            { status: 503, headers: { "Retry-After": String(retryAfter) } },
          );
        }
        return Response.json({ error: "Gemini rejected the narration request." }, { status: 502 });
      }
      return Response.json({ error: "Narration could not be generated." }, { status: 502 });
    } catch (error) {
      console.error("Gemini narration network error", error);
      return Response.json({ error: "Gemini narration could not be reached." }, { status: 502 });
    }
  });
  narrationQueue = task.then(() => undefined, () => undefined);
  return task;
}
