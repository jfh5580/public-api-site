// Open DART 연동 (서버 전용). 요청 URL에는 키가 들어가므로 URL·원문 에러를 로그/응답에 남기지 않는다.
import { unzipSync, strFromU8 } from "fflate";
import { XMLParser } from "fast-xml-parser";
import { ApiError } from "./errors";
import { COMPANIES, type Company, type DisclosureItem } from "./types";

const BASE = "https://opendart.fss.or.kr/api";
const TIMEOUT_MS = 10_000;

// 화면 표기 → DART 고유번호 파일의 corp_name (정확 일치).
// 고유번호 ZIP(corpCode.xml)과 대조 완료(2026-10-13): 세 법인명 모두 정확히 1건 일치.
// 일치 0건이면 추측하지 않고 오류로 안내한다.
const DART_CORP_NAME: Record<Company, string> = {
  현대해상: "현대해상",
  삼성화재: "삼성화재해상보험",
  DB손해보험: "DB손해보험",
};

const corpCodeCache = new Map<Company, string>();

export function isCompany(v: unknown): v is Company {
  return typeof v === "string" && (COMPANIES as readonly string[]).includes(v);
}

async function dartFetch(path: string, params: Record<string, string>): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/${path}?${new URLSearchParams(params).toString()}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("error", "network", "Open DART 연결 실패 또는 시간 초과(10초)입니다.", 502);
  }
  if (!res.ok) {
    throw new ApiError("error", "upstream", `Open DART HTTP 오류(${res.status})입니다.`, 502);
  }
  return res;
}

// DART status 코드 → 오류. 코드 의미는 공식 가이드 대조 필요(010·011·012·020·100).
function statusError(code: string, message: string): ApiError {
  if (code === "010" || code === "011" || code === "012") {
    return new ApiError(
      "error",
      "key",
      `Open DART 키 오류(코드 ${code})입니다. 서버의 DART_API_KEY를 확인하세요.`,
      502,
    );
  }
  if (code === "020") {
    return new ApiError("rate_limited", undefined, "Open DART 요청 한도 초과입니다. 잠시 후 다시 시도하세요.", 429);
  }
  if (code === "100") {
    return new ApiError("error", "request", "Open DART 요청 값 오류(코드 100)입니다.", 502);
  }
  return new ApiError(
    "error",
    "upstream",
    `Open DART 응답 오류(코드 ${code}): ${message.slice(0, 100)}`,
    502,
  );
}

function ensureArray<T>(v: T | T[] | undefined): T[] {
  return v === undefined ? [] : Array.isArray(v) ? v : [v];
}

async function loadCorpCodes(key: string): Promise<void> {
  const res = await dartFetch("corpCode.xml", { crtfc_key: key });
  let buf: Uint8Array;
  try {
    buf = new Uint8Array(await res.arrayBuffer());
  } catch {
    throw new ApiError("error", "network", "Open DART 고유번호 파일 수신 중 연결 실패 또는 시간 초과입니다.", 502);
  }

  // 정상 응답은 ZIP("PK"). 아니면 상태 XML/텍스트다.
  if (!(buf[0] === 0x50 && buf[1] === 0x4b)) {
    const text = new TextDecoder().decode(buf.slice(0, 2000));
    const code = /<status>\s*(\d+)\s*<\/status>/.exec(text)?.[1] ?? "unknown";
    const msg = /<message>\s*([^<]*)\s*<\/message>/.exec(text)?.[1] ?? "";
    throw statusError(code, msg);
  }

  let xml: string;
  try {
    const files = unzipSync(buf, { filter: (f) => f.name.toLowerCase().endsWith(".xml") });
    const entry = Object.values(files)[0];
    if (!entry) throw new Error("empty");
    xml = strFromU8(entry);
  } catch {
    throw new ApiError("error", "upstream", "고유번호 ZIP을 해제하지 못했습니다.", 502);
  }

  // parseTagValue:false → 8자리 corp_code의 앞자리 0 보존
  const parsed = new XMLParser({ parseTagValue: false }).parse(xml) as {
    result?: { list?: { corp_code?: string; corp_name?: string } | { corp_code?: string; corp_name?: string }[] };
  };
  const list = ensureArray(parsed.result?.list);

  for (const company of COMPANIES) {
    const matches = list.filter((r) => r.corp_name === DART_CORP_NAME[company]);
    const code = matches.length === 1 ? matches[0].corp_code : undefined;
    if (code && /^\d{8}$/.test(code)) corpCodeCache.set(company, code);
  }
}

export async function resolveCorpCode(company: Company, key: string): Promise<string> {
  const cached = corpCodeCache.get(company);
  if (cached) return cached;
  await loadCorpCodes(key);
  const code = corpCodeCache.get(company);
  if (!code) {
    throw new ApiError(
      "error",
      "request",
      `고유번호 파일에서 '${DART_CORP_NAME[company]}'을(를) 정확히 1건 찾지 못했습니다. 추측하지 않고 중단합니다(확인 필요).`,
      502,
    );
  }
  return code;
}

const ymd = (d: Date) =>
  `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;

// 오늘(KST) 기준 N개월 전 ~ 오늘
export function kstRange(months: number): { bgn: string; end: string } {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - months, 1));
  const lastDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  start.setUTCDate(Math.min(now.getUTCDate(), lastDay));
  return { bgn: ymd(start), end: ymd(now) };
}

interface DartListRow {
  corp_name?: string;
  report_nm?: string;
  rcept_no?: string;
  rcept_dt?: string;
}

const fmtDate = (d: string) => (/^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d);

// 최신 3건. 빈 목록(013)이면 빈 배열을 반환한다.
export async function fetchLatest(
  corpCode: string,
  months: number,
  key: string,
): Promise<DisclosureItem[]> {
  const { bgn, end } = kstRange(months);
  const res = await dartFetch("list.json", {
    crtfc_key: key,
    corp_code: corpCode,
    bgn_de: bgn,
    end_de: end,
    sort: "date",
    sort_mth: "desc",
    page_no: "1",
    page_count: "3",
  });

  let body: { status?: string; message?: string; list?: DartListRow[] };
  try {
    body = await res.json();
  } catch {
    throw new ApiError("error", "upstream", "Open DART 응답을 해석하지 못했습니다.", 502);
  }

  const status = body.status ?? "unknown";
  if (status === "013") return [];
  if (status !== "000") throw statusError(status, body.message ?? "");

  return (body.list ?? [])
    .slice(0, 3)
    .map((r) => ({
      corp_name: r.corp_name ?? "",
      report_nm: (r.report_nm ?? "").trim(),
      rcept_dt: fmtDate(r.rcept_dt ?? ""),
      // 접수번호는 API 반환값만 사용한다.
      url: r.rcept_no && /^\d+$/.test(r.rcept_no)
        ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${r.rcept_no}`
        : null,
    }))
    .sort((a, b) => (a.rcept_dt < b.rcept_dt ? 1 : a.rcept_dt > b.rcept_dt ? -1 : 0));
}
