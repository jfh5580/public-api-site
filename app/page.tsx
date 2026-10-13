"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  COMPANIES,
  MONTH_OPTIONS,
  type ApiState,
  type BriefingResponse,
  type Company,
  type DisclosuresResponse,
} from "@/lib/types";

type View = ApiState | "loading";

const BADGE: Record<View, { icon: string; label: string }> = {
  loading: { icon: "…", label: "조회 중" },
  ok: { icon: "●", label: "정상" },
  empty: { icon: "○", label: "빈 목록" },
  error: { icon: "▲", label: "오류" },
  rate_limited: { icon: "■", label: "한도 초과" },
};

const kst = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false }) + " (KST)" : "";

function Badge({ view }: { view: View }) {
  const b = BADGE[view];
  return (
    <span className={`badge badge-${view}`} role="status">
      <span aria-hidden="true">{b.icon}</span> {b.label}
    </span>
  );
}

export default function Home() {
  const [company, setCompany] = useState<Company>("현대해상");
  const [months, setMonths] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DisclosuresResponse | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);
  const [brief, setBrief] = useState<BriefingResponse | null>(null);
  const reqId = useRef(0);

  async function search() {
    const id = ++reqId.current;
    setLoading(true);
    setData(null);
    setBrief(null);
    try {
      const res = await fetch(`/api/disclosures?company=${encodeURIComponent(company)}&months=${months}`);
      const body = (await res.json()) as DisclosuresResponse;
      if (id === reqId.current) setData(body);
    } catch {
      if (id === reqId.current)
        setData({ state: "error", reason: "network", message: "서버 응답을 받지 못했습니다.", items: [] });
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  async function makeBrief() {
    if (!data || data.state !== "ok" || !data.company || !data.months) return;
    setBriefLoading(true);
    setBrief(null);
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: data.company,
          months: data.months,
          items: data.items.map(({ corp_name, report_nm, rcept_dt }) => ({ corp_name, report_nm, rcept_dt })),
        }),
      });
      setBrief((await res.json()) as BriefingResponse);
    } catch {
      setBrief({ state: "error", reason: "network", message: "서버 응답을 받지 못했습니다." });
    } finally {
      setBriefLoading(false);
    }
  }

  const view: View | null = loading ? "loading" : data ? data.state : null;
  const canBrief = !!data && data.state === "ok" && data.items.length > 0 && !briefLoading;

  return (
    <main>
      <h1>보험사 공시 조회</h1>
      <p className="sub">
        Open DART 최신 공시 3건과 원문 링크, 목록(제목·접수일)만 근거로 한 3줄 브리핑. 개인 학습용 · 공개 자료만 사용.
      </p>

      <form
        className="controls"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label>
          회사
          <select value={company} onChange={(e) => setCompany(e.target.value as Company)} disabled={loading}>
            {COMPANIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          기간
          <select value={months} onChange={(e) => setMonths(Number(e.target.value))} disabled={loading}>
            {MONTH_OPTIONS.map((m) => (
              <option key={m} value={m}>
                최근 {m}개월
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={loading}>
          {loading ? "조회 중…" : "조회"}
        </button>
      </form>

      {view && (
        <section aria-live="polite" className="panel">
          <div className="row">
            <Badge view={view} />
            {data?.company && data.months && (
              <span className="muted">
                {data.company} · 최근 {data.months}개월
              </span>
            )}
          </div>

          {view === "loading" && <p>Open DART에서 조회하는 중입니다…</p>}
          {view === "empty" && <p>해당 기간 공시 없음. 브리핑은 만들지 않습니다.</p>}
          {view === "rate_limited" && <p>한도 초과, 잠시 후 재시도하세요. {data?.message}</p>}
          {view === "error" && (
            <p>
              {data?.message ?? "오류가 발생했습니다."}
              {data?.reason && <span className="muted"> (원인: {data.reason})</span>}
            </p>
          )}

          {view === "ok" && data && (
            <table>
              <thead>
                <tr>
                  <th>회사</th>
                  <th>제목</th>
                  <th>접수일</th>
                  <th>원문</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it, i) => (
                  <tr key={`${it.rcept_dt}-${i}`}>
                    <td data-label="회사">{it.corp_name}</td>
                    <td data-label="제목">{it.report_nm}</td>
                    <td data-label="접수일">{it.rcept_dt}</td>
                    <td data-label="원문">
                      {it.url ? (
                        <a href={it.url} target="_blank" rel="noopener noreferrer">
                          DART 원문 ↗
                        </a>
                      ) : (
                        "링크 없음"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {data?.fetchedAt && (
            <p className="muted">
              조회 시각 {kst(data.fetchedAt)} · 출처 {data.source}
            </p>
          )}
        </section>
      )}

      {data && data.state !== "empty" && data.state !== "error" && data.state !== "rate_limited" && (
        <section className="panel">
          <div className="row">
            <h2>3줄 브리핑</h2>
            <button type="button" onClick={() => void makeBrief()} disabled={!canBrief}>
              {briefLoading ? "생성 중…" : "브리핑 만들기"}
            </button>
          </div>

          {brief && (
            <>
              <div className="row">
                <Badge view={brief.state} />
              </div>
              {brief.state === "ok" && brief.lines && (
                <>
                  <p className="tag">공시 목록 브리핑 · 본문 미확인</p>
                  <ol>
                    {brief.lines.map((l, i) => (
                      <li key={i}>{l}</li>
                    ))}
                  </ol>
                  <p className="muted">
                    생성 시각 {kst(brief.generatedAt)} · 모델 {brief.model} · 근거 {brief.basis}
                  </p>
                </>
              )}
              {brief.state !== "ok" && (
                <p>
                  {brief.state === "rate_limited" ? "한도 초과, 잠시 후 재시도하세요. " : ""}
                  {brief.message}
                  {brief.reason && <span className="muted"> (원인: {brief.reason})</span>}
                </p>
              )}
            </>
          )}
          {!brief && <p className="muted">목록에 있는 제목·접수일만 Gemini에 전달합니다. 원문이 정본입니다.</p>}
        </section>
      )}

      <p className="sub">
        <Link href="/report">주간 AI 동향 보고 보기 →</Link>
      </p>
    </main>
  );
}
