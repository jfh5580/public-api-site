import type { NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { failure, json } from "@/lib/http";
import { ApiError } from "@/lib/errors";
import { buildUserText, parseInput, validateLines } from "@/lib/briefing";
import { generateLines, normalizeModel } from "@/lib/gemini";
import type { BriefingResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ state: "error", reason: "request", message: "요청 본문이 JSON이 아닙니다." }, 400);
  }

  const parsed = parseInput(raw);
  if (!parsed.ok) return json({ state: "error", reason: "request", message: parsed.message }, 400);
  const input = parsed.value;

  // 빈 목록이면 Gemini를 호출하지 않는다.
  if (input.items.length === 0) {
    return json({ state: "empty", message: "목록이 비어 있어 브리핑을 만들지 않았습니다(Gemini 미호출)." });
  }

  try {
    const env = getEnv(["GEMINI_API_KEY", "GEMINI_MODEL"]);
    const model = normalizeModel(env.GEMINI_MODEL);
    const userText = buildUserText(input);

    const lines = await generateLines(model, env.GEMINI_API_KEY, userText);
    const checked = validateLines(lines, userText);
    if (!checked.ok) {
      throw new ApiError(
        "error",
        "validation",
        "브리핑 검증 실패(3줄·숫자·금지어 기준). 가짜 브리핑을 만들지 않고 중단했습니다.",
        502,
      );
    }

    const body: BriefingResponse = {
      state: "ok",
      lines: checked.lines,
      generatedAt: new Date().toISOString(),
      model,
      basis: "공시 목록(제목·접수일)",
    };
    return json(body);
  } catch (e) {
    return failure(e);
  }
}
