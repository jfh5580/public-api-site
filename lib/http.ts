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
  return json(
    { state: "error", reason: "upstream", message: "처리 중 알 수 없는 오류가 발생했습니다.", ...extra },
    500,
  );
}
