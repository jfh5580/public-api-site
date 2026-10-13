// 클라이언트·서버 공용 타입. 서버 전용 모듈을 import하지 않는다.

export const COMPANIES = ["현대해상", "삼성화재", "DB손해보험"] as const;
export type Company = (typeof COMPANIES)[number];

export const MONTH_OPTIONS = [1, 2, 3] as const;

export type ApiState = "ok" | "empty" | "error" | "rate_limited";
export type ErrorReason =
  | "config" // 서버 환경변수 누락
  | "key" // 키 오류
  | "request" // 요청 오류
  | "network" // 연결·시간 초과
  | "upstream" // 상대 서버 오류
  | "model" // 모델 사용 불가
  | "validation"; // 응답 검증 실패

export interface DisclosureItem {
  corp_name: string;
  report_nm: string;
  rcept_dt: string; // YYYY-MM-DD
  url: string | null; // DART 원문 링크 (rcept_no는 API 반환값만 사용)
}

export interface DisclosuresResponse {
  state: ApiState;
  reason?: ErrorReason;
  message?: string;
  company?: Company;
  months?: number;
  items: DisclosureItem[];
  fetchedAt?: string; // ISO
  source?: "Open DART";
}

export interface BriefingResponse {
  state: ApiState;
  reason?: ErrorReason;
  message?: string;
  lines?: string[];
  generatedAt?: string;
  model?: string;
  basis?: "공시 목록(제목·접수일)";
}
