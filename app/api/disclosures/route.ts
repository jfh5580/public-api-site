import type { NextRequest } from "next/server";
import { getEnv } from "@/lib/env";
import { failure, json } from "@/lib/http";
import { fetchLatest, isCompany, resolveCorpCode } from "@/lib/dart";
import type { DisclosuresResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const company = req.nextUrl.searchParams.get("company");
  const months = Number(req.nextUrl.searchParams.get("months"));

  if (!isCompany(company) || ![1, 2, 3].includes(months)) {
    return json(
      { state: "error", reason: "request", message: "company(3개 중 하나)와 months(1~3)가 필요합니다.", items: [] },
      400,
    );
  }

  try {
    const { DART_API_KEY } = getEnv(["DART_API_KEY"]);
    const corpCode = await resolveCorpCode(company, DART_API_KEY);
    const items = await fetchLatest(corpCode, months, DART_API_KEY);
    const body: DisclosuresResponse = {
      state: items.length > 0 ? "ok" : "empty",
      message: items.length > 0 ? undefined : "해당 기간 공시 없음",
      company,
      months,
      items,
      fetchedAt: new Date().toISOString(),
      source: "Open DART",
    };
    return json(body);
  } catch (e) {
    return failure(e, { items: [], company, months });
  }
}
