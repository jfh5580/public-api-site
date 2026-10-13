import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "보험사 공시 조회",
  description: "보험사 최신 공시 3건과 원문 링크, 목록 기반 3줄 브리핑 (개인 학습용)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
