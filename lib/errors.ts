import type { ApiState, ErrorReason } from "./types";

// 사용자에게 보여 줘도 안전한 메시지만 담는다. 키·요청 URL을 넣지 않는다.
export class ApiError extends Error {
  constructor(
    public state: Exclude<ApiState, "ok">,
    public reason: ErrorReason | undefined,
    message: string,
    public http: number,
  ) {
    super(message);
  }
}
