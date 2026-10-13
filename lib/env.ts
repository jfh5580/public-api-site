// 서버 전용 환경변수 로더. Route Handler에서만 import한다. 클라이언트 코드에서 import 금지.
// 값은 로그·응답·에러 메시지에 넣지 않는다. 변수 이름만 보고한다.
// 로컬: .env.local (Next.js가 자동 로드) / 배포: Vercel Environment Variables.
import { ApiError } from "./errors";

const NAMES = ["DART_API_KEY", "GEMINI_API_KEY", "GEMINI_MODEL"] as const;
export type EnvName = (typeof NAMES)[number];

function read(name: EnvName): string | null {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

// 설정 여부만 반환한다(값 아님).
export function envStatus(): Record<EnvName, boolean> {
  return {
    DART_API_KEY: read("DART_API_KEY") !== null,
    GEMINI_API_KEY: read("GEMINI_API_KEY") !== null,
    GEMINI_MODEL: read("GEMINI_MODEL") !== null,
  };
}

// 필요한 값을 읽는다. 비어 있으면 누락된 이름만 담아 ApiError를 던진다.
export function getEnv<K extends EnvName>(names: readonly K[]): Record<K, string> {
  const missing = names.filter((n) => read(n) === null);
  if (missing.length > 0) {
    throw new ApiError(
      "error",
      "config",
      `서버 환경변수가 비어 있습니다: ${missing.join(", ")}. .env.local 또는 Vercel 환경변수를 확인하세요.`,
      500,
    );
  }
  const out = {} as Record<K, string>;
  for (const n of names) out[n] = read(n) as string;
  return out;
}
