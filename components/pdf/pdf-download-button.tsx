"use client";

import { useState } from "react";
import type { PdfMeeting, PdfReview, PdfQuestion } from "./review-pdf-document";

interface Props {
  meetingId: string;
  selectedMembers: string[];
  disabled?: boolean;
}

export default function PdfDownloadButton({ meetingId, selectedMembers, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    if (disabled || loading) return;
    setLoading(true);
    setError("");
    try {
      // 데이터 fetch
      const [meetingRes, questionsRes] = await Promise.all([
        fetch(`/api/meetings/${meetingId}`),
        fetch(`/api/discussion?meetingId=${meetingId}`),
      ]);

      const { meeting: rawMeeting, reviews: allReviews } = await meetingRes.json();
      const questionsRaw = questionsRes.ok ? await questionsRes.json() : [];

      const meeting: PdfMeeting = rawMeeting;
      const reviews: PdfReview[] = (allReviews ?? []).filter((r: PdfReview) =>
        selectedMembers.includes(r.author_name)
      );
      const questions: PdfQuestion[] = Array.isArray(questionsRaw)
        ? questionsRaw.filter((q: any) => q.is_public !== false)
        : [];

      // react-pdf는 SSR 비호환 → 런타임에 import
      const [{ pdf }, { default: ReviewPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./review-pdf-document"),
      ]);

      const blob = await pdf(
        <ReviewPdfDocument
          meeting={meeting}
          reviews={reviews}
          questions={questions}
          selectedMembers={selectedMembers}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${meeting.title.replace(/\s+/g, "_")}_책피바라.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      setError("PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleGenerate}
        disabled={disabled || loading}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1C1A17] text-white text-sm font-medium hover:bg-[#8B3A2A] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <><span className="inline-block animate-spin">⟳</span> PDF 생성 중...</>
        ) : (
          <>PDF 다운로드</>
        )}
      </button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
