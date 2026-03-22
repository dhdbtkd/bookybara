"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { PdfMeeting, PdfReview, PdfQuestion } from "./review-pdf-document";

// react-pdf는 SSR 비호환 → 클라이언트 전용 동적 import
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((m) => m.PDFDownloadLink),
  { ssr: false }
);

const ReviewPdfDocument = dynamic(
  () => import("./review-pdf-document"),
  { ssr: false }
);

interface Props {
  meetingId: string;
  selectedMembers: string[];
  disabled?: boolean;
}

export default function PdfDownloadButton({ meetingId, selectedMembers, disabled }: Props) {
  const [data, setData] = useState<{
    meeting: PdfMeeting;
    reviews: PdfReview[];
    questions: PdfQuestion[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchAndGenerate() {
    if (disabled || loading) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const BOOKS_SELECT = "meeting_books(books(id,title,author,cover_url,cover_url_hires))";
      const [meetingRes, questionsRes] = await Promise.all([
        fetch(`/api/meetings/${meetingId}`),
        fetch(`/api/discussion?meetingId=${meetingId}`),
      ]);

      const { meeting: rawMeeting, reviews: allReviews } = await meetingRes.json();
      const allReviewsData: PdfReview[] = (allReviews ?? []);
      const questionsRaw = questionsRes.ok ? await questionsRes.json() : [];

      const meeting: PdfMeeting = rawMeeting;
      const reviews = allReviewsData.filter((r) => selectedMembers.includes(r.author_name));
      const questions: PdfQuestion[] = Array.isArray(questionsRaw)
        ? questionsRaw.filter((q: any) => q.is_public !== false)
        : [];

      setData({ meeting, reviews, questions });
    } catch (e) {
      setError("데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const filename = data
    ? `${data.meeting.title.replace(/\s+/g, "_")}_책피바라.pdf`
    : "독후감.pdf";

  if (data) {
    return (
      <div className="flex items-center gap-3">
        <PDFDownloadLink
          document={
            <ReviewPdfDocument
              meeting={data.meeting}
              reviews={data.reviews}
              questions={data.questions}
              selectedMembers={selectedMembers}
            />
          }
          fileName={filename}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#8B3A2A] text-white text-sm font-medium hover:bg-[#6B2A1A] transition-colors cursor-pointer"
        >
          {({ loading: pdfLoading }: { loading: boolean }) =>
            pdfLoading ? "PDF 렌더링 중..." : "⬇ PDF 다운로드"
          }
        </PDFDownloadLink>
        <button
          onClick={() => setData(null)}
          className="text-xs text-neutral-400 hover:text-neutral-600 underline underline-offset-2 cursor-pointer"
        >
          다시 생성
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={fetchAndGenerate}
        disabled={disabled || loading}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1C1A17] text-white text-sm font-medium hover:bg-[#8B3A2A] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><span className="animate-spin">⟳</span> 데이터 불러오는 중...</>
        ) : (
          <>PDF 생성하기</>
        )}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
