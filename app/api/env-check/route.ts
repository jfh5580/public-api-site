import { envStatus } from "@/lib/env";
import { json } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 값은 반환하지 않고 설정 여부(true/false)만 반환한다.
export function GET() {
  return json({ configured: envStatus() });
}
