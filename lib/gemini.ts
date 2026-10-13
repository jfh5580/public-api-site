// Gemini REST 호출 (서버 전용, SDK 없음). 키는 헤더로만 전달한다.
// 모델은 GEMINI_MODEL 값을 그대로 쓴다. 사용 불가여도 다른 모델·유료 모델로 대체하지 않는다.
// 확인 필요: 헤더·JSON 스키마 옵션 이름은 공식 문서와 대조할 것.
import { ApiError } from "./errors";
import { SYSTEM_PROMPT } from "./briefing";

const TIMEOUT_MS = 20_000;

export function normalizeModel(raw: string): string {
  const m = raw.replace(/^models\//, "");
  if (!/^[A-Za-z0-9._-]+$/.test(m)) {
    throw new ApiError("error", "config", "GEMINI_MODEL 형식이 올바르지 않습니다.", 500);
  }
  return m;
}

export async function generateLines(model: string, apiKey: string, userText: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: { lines: { type: "ARRAY", items: { type: "STRING" }, minItems: 3, maxItems: 3 } },
            required: ["lines"],
          },
        },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("error", "network", "Gemini 연결 실패 또는 시간 초과(20초)입니다.", 502);
  }

  if (res.status === 429) {
    throw new ApiError("rate_limited", undefined, "Gemini 한도 초과입니다. 잠시 후 다시 시도하세요.", 429);
  }
  if (res.status === 404) {
    throw new ApiError(
      "error",
      "model",
      "GEMINI_MODEL을 사용할 수 없습니다. 모델명과 무료 대상 여부를 확인하세요(자동 대체 안 함).",
      502,
    );
  }
  if (res.status === 400 || res.status === 401 || res.status === 403) {
    throw new ApiError(
      "error",
      "key",
      `Gemini 키·요청 오류(HTTP ${res.status})입니다. GEMINI_API_KEY·GEMINI_MODEL을 확인하세요.`,
      502,
    );
  }
  if (!res.ok) {
    throw new ApiError("error", "upstream", `Gemini 서버 오류(HTTP ${res.status})입니다.`, 502);
  }

  try {
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("no text");
    return (JSON.parse(text) as { lines?: unknown }).lines;
  } catch {
    throw new ApiError("error", "validation", "Gemini 응답을 해석하지 못했습니다. 브리핑을 만들지 않았습니다.", 502);
  }
}
