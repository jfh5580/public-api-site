import type { Metadata } from "next";
import Link from "next/link";
import {
  REPORT_META,
  REPORT_OVERVIEW,
  REPORT_SCOPE,
  REPORT_SECTIONS,
  REPORT_SOURCE,
  REPORT_SOURCES,
  REPORT_STATUS,
  REPORT_TITLE,
  type Block,
} from "@/lib/weeklyBriefing";

export const metadata: Metadata = {
  title: "주간 AI 동향 보고",
  description: "금융·보험업 AI 동향 주간 보고 (개인 학습용, 공개 자료만 사용)",
};

function ReportBlock({ block }: { block: Block }) {
  return (
    <article className="wk-card">
      <h3>{block.title}</h3>
      {block.note && <p className="muted">{block.note}</p>}
      {block.table && (
        <table>
          <thead>
            <tr>
              {block.table.head.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((r) => (
              <tr key={r[0]}>
                {r.map((c, i) => (
                  <td key={i} data-label={block.table!.head[i]}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {block.bullets && (
        <ul>
          {block.bullets.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
      {block.ordered && (
        <ol>
          {block.ordered.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      )}
    </article>
  );
}

export default function ReportPage() {
  return (
    <main>
      <p className="sub">
        <Link href="/">← 공시 조회로 돌아가기</Link>
      </p>
      <section className="panel" aria-labelledby="weekly-title">
        <h1 id="weekly-title">{REPORT_TITLE}</h1>
        <p className="tag">{REPORT_STATUS}</p>
        <dl className="meta-list">
          {REPORT_META.map((m) => (
            <div key={m.label}>
              <dt>{m.label}</dt>
              <dd>{m.value}</dd>
            </div>
          ))}
        </dl>

        <ReportBlock block={REPORT_OVERVIEW} />
        {REPORT_SECTIONS.map((b) => (
          <ReportBlock key={b.title} block={b} />
        ))}

        <article className="wk-card">
          <h3>6. 출처 (접근일 2026-10-12)</h3>
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th>발행주체</th>
                <th>게시일</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              {REPORT_SOURCES.map((s) => (
                <tr key={s.url}>
                  <td data-label="제목">{s.title}</td>
                  <td data-label="발행주체">{s.publisher}</td>
                  <td data-label="게시일">{s.date}</td>
                  <td data-label="URL" className="url">
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.url} ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="wk-card">
          <h3>7. AI와 사람의 확인 범위</h3>
          <ul>
            {REPORT_SCOPE.map((s) => (
              <li key={s.who}>
                <strong>{s.who}:</strong> {s.what}
              </li>
            ))}
          </ul>
        </article>
        <p className="muted">원문 {REPORT_SOURCE} · 공개 뉴스 기사 기준</p>
      </section>
    </main>
  );
}
