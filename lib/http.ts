import { NextResponse } from "next/server";
import { ApiError } from "./errors";

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// 예상 밖 예외의 원문은 응답·로그에 담지 않는다(키·URL 유출 방지).
export function failure(e: unknown, extra: Record<string, unknown> = {}) {
  if (e instanceof ApiError) {
    return json({ state: e.state, reason: e.reason, message: e.message, ...extra }, e.http);
  }
  // 진단용: 오류 종류와 키를 가린 메시지 앞부분만 서버 로그에 남긴다(응답에는 넣지 않는다).
  const name = e instanceof Error ? e.name : typeof e;
  const msg = (e instanceof Error ? e.message : "").replace(/(crtfc_key|key)=[^&\s"]+/gi, "$1=***").slice(0, 120);
  console.error(`[unexpected] ${name}: ${msg}`);
  return json(
    { state: "error", reason: "upstream", message: "처리 중 알 수 없는 오류가 발생했습니다.", ...extra },
    500,
  );
}
