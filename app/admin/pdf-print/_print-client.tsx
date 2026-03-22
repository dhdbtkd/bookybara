"use client";

import { useEffect } from "react";

type Book = { id: number; title: string; author: string; cover_url: string | null; cover_url_hires: string | null };
type Review = { id: number; author_name: string; content: string; book_id: number; books: { title: string; author: string } | null };
type Meeting = { id: number; title: string; date: string; location: string | null; books: Book[] };
type Question = { id: number; book_id: number; questions: string; books: { title: string } | null };

interface Props {
  meeting: Meeting;
  reviews: Review[];
  questions: Question[];
  selectedMembers: string[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const w = weekdays[d.getDay()];
  return `${y}년 ${m}월 ${day}일 (${w})`;
}

export default function PrintClient({ meeting, reviews, questions, selectedMembers }: Props) {
  useEffect(() => {
    // 루트 레이아웃 요소 숨기기
    document.documentElement.classList.add("pdf-print-mode");
    document.title = `${meeting.title} — 책피바라`;
    return () => document.documentElement.classList.remove("pdf-print-mode");
  }, [meeting.title]);

  useEffect(() => {
    // 이미지 로딩 완료 후 print
    const images = document.querySelectorAll("img");
    if (images.length === 0) {
      setTimeout(() => window.print(), 300);
      return;
    }
    let loaded = 0;
    const total = images.length;
    const check = () => { if (++loaded >= total) setTimeout(() => window.print(), 300); };
    images.forEach((img) => {
      if (img.complete) check();
      else { img.addEventListener("load", check); img.addEventListener("error", check); }
    });
  }, []);

  const selectedReviews = reviews.filter((r) => selectedMembers.includes(r.author_name));
  const questionsByBook = new Map<number, string[]>();
  for (const q of questions) {
    const qList: string[] = JSON.parse(q.questions);
    if (!questionsByBook.has(q.book_id)) questionsByBook.set(q.book_id, []);
    questionsByBook.get(q.book_id)!.push(...qList);
  }

  return (
    <>
      <style>{`
        @import url('//fonts.googleapis.com/earlyaccess/nanummyeongjo.css');

        /* ── 화면 공통 ── */
        html.pdf-print-mode nav { display: none !important; }
        html.pdf-print-mode body { background: #d1d5db !important; }
        html.pdf-print-mode main {
          max-width: none !important;
          margin: 0 !important;
          padding: 32px !important;
        }
        #pdf-root-wrapper * { font-family: 'Nanum Myeongjo', 'NanumMyeongjo', serif !important; }

        /* ── 화면 미리보기: 고정 높이 A4 카드 ── */
        @media screen {
          .pdf-page {
            width: 210mm;
            min-height: 297mm;
            padding: 22mm 20mm;
            background: white;
            margin: 0 auto 32px;
            box-shadow: 0 4px 32px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
            position: relative;
          }
        }

        /* ── 인쇄: @page로 여백 관리, 고정 높이 제거 ── */
        @media print {
          @page { size: A4 portrait; margin: 20mm 18mm; }

          html.pdf-print-mode body { background: white !important; }
          html.pdf-print-mode main { padding: 0 !important; }
          nav, [aria-hidden="true"], [data-sonner-toaster] { display: none !important; }

          #pdf-root-wrapper { background: white; }

          .pdf-page {
            /* 여백은 @page가 처리 — 고정 높이/패딩 없앰 */
            padding: 0;
            margin: 0;
            box-shadow: none;
            page-break-after: always;
            break-after: page;
            display: flex;
            flex-direction: column;
          }
          .pdf-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          /* 표지는 한 페이지에 꽉 채우기 */
          .pdf-cover {
            min-height: calc(297mm - 40mm);
            justify-content: space-between;
          }
        }
      `}</style>

      <div id="pdf-root-wrapper">
        {/* ── 표지 ── */}
        <div className="pdf-page pdf-cover" style={{ background: "#FDFAF7" }}>
          {/* 상단 클럽명 */}
          <div style={{ textAlign: "center", paddingTop: "8mm" }}>
            <p style={{ fontSize: "11px", letterSpacing: "0.4em", color: "#8B3A2A", fontWeight: "bold", marginBottom: "8px" }}>
              BOOK CLUB
            </p>
            <h1 style={{ fontSize: "40px", fontWeight: "bold", color: "#1C1A17", letterSpacing: "0.15em", marginBottom: "4px" }}>
              책피바라
            </h1>
            <div style={{ width: "40mm", height: "1.5px", background: "#C8956C", margin: "12px auto" }} />
          </div>

          {/* 중앙 – 도서 커버 + 제목 */}
          <div style={{ textAlign: "center", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px" }}>
            <p style={{ fontSize: "14px", color: "#6B5E52", letterSpacing: "0.1em" }}>
              {meeting.title}
            </p>

            <div style={{ display: "flex", gap: "20px", justifyContent: "center", margin: "8px 0" }}>
              {meeting.books.map((book) => {
                const cover = book.cover_url_hires || book.cover_url;
                return cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={book.id}
                    src={cover}
                    alt={book.title}
                    style={{ width: "52mm", height: "76mm", objectFit: "cover", borderRadius: "4px", boxShadow: "4px 8px 24px rgba(0,0,0,0.22)" }}
                  />
                ) : (
                  <div key={book.id} style={{ width: "52mm", height: "76mm", background: "#D4C5B0", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <p style={{ fontSize: "11px", color: "#9C8E7E" }}>표지 없음</p>
                  </div>
                );
              })}
            </div>

            {meeting.books.map((book) => (
              <div key={book.id} style={{ textAlign: "center" }}>
                <p style={{ fontSize: "19px", fontWeight: "bold", color: "#1C1A17", marginBottom: "4px" }}>{book.title}</p>
                <p style={{ fontSize: "12px", color: "#9C8E7E" }}>{book.author}</p>
              </div>
            ))}
          </div>

          {/* 하단 – 날짜 + 참석자 */}
          <div style={{ textAlign: "center", paddingBottom: "8mm" }}>
            <div style={{ width: "100%", height: "1px", background: "#D4C5B0", marginBottom: "12px" }} />
            <p style={{ fontSize: "12px", color: "#6B5E52", letterSpacing: "0.08em", marginBottom: "10px" }}>
              {formatDate(meeting.date)}{meeting.location ? `　·　${meeting.location}` : ""}
            </p>
            <p style={{ fontSize: "11px", color: "#9C8E7E", letterSpacing: "0.06em" }}>
              {selectedMembers.join("　·　")}
            </p>
          </div>
        </div>

        {/* ── 독후감 페이지들 ── */}
        {selectedReviews.map((review) => {
          const book = meeting.books.find((b) => b.id === review.book_id);
          const cover = book ? (book.cover_url_hires || book.cover_url) : null;
          const paragraphs = review.content.split("\n").filter((l) => l.trim());

          return (
            <div key={review.id} className="pdf-page">
              {/* 헤더 */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "14px", marginBottom: "10mm", paddingBottom: "6mm", borderBottom: "2px solid #1C1A17" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "9px", letterSpacing: "0.3em", color: "#8B3A2A", marginBottom: "6px" }}>
                    독후감 · 책피바라 · {meeting.title}
                  </p>
                  <h2 style={{ fontSize: "28px", fontWeight: "bold", color: "#1C1A17", marginBottom: "5px" }}>
                    {review.author_name}
                  </h2>
                  {book && (
                    <p style={{ fontSize: "11px", color: "#9C8E7E" }}>
                      {book.title}{book.author ? `　·　${book.author}` : ""}
                    </p>
                  )}
                </div>
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={book?.title}
                    style={{ width: "18mm", height: "26mm", objectFit: "cover", borderRadius: "3px", flexShrink: 0, boxShadow: "2px 3px 10px rgba(0,0,0,0.15)" }}
                  />
                )}
              </div>

              {/* 본문 */}
              <div style={{ fontSize: "12.5px", lineHeight: "2.2", color: "#2C2520", flex: 1 }}>
                {paragraphs.map((para, i) => (
                  <p key={i} style={{ marginBottom: "0.6em", textIndent: "1.5em" }}>{para}</p>
                ))}
              </div>

              {/* 푸터 */}
              <div style={{ marginTop: "auto", paddingTop: "6mm", borderTop: "1px solid #EDE8E2", display: "flex", justifyContent: "space-between" }}>
                <p style={{ fontSize: "9px", color: "#C8BEB4", letterSpacing: "0.15em" }}>책피바라</p>
                <p style={{ fontSize: "9px", color: "#C8BEB4", letterSpacing: "0.1em" }}>{formatDate(meeting.date)}</p>
              </div>
            </div>
          );
        })}

        {/* ── AI 토론 질문 페이지 ── */}
        {questions.length > 0 && (
          <div className="pdf-page">
            <div style={{ marginBottom: "10mm", paddingBottom: "6mm", borderBottom: "2px solid #1C1A17" }}>
              <p style={{ fontSize: "9px", letterSpacing: "0.3em", color: "#8B3A2A", marginBottom: "6px" }}>
                AI 생성 · 책피바라 · {meeting.title}
              </p>
              <h2 style={{ fontSize: "28px", fontWeight: "bold", color: "#1C1A17" }}>토론 질문</h2>
            </div>

            <div style={{ flex: 1 }}>
              {meeting.books.map((book) => {
                const qs = questionsByBook.get(book.id) ?? [];
                if (qs.length === 0) return null;
                return (
                  <div key={book.id} style={{ marginBottom: "10mm" }}>
                    {meeting.books.length > 1 && (
                      <p style={{ fontSize: "12px", fontWeight: "bold", color: "#6B5E52", marginBottom: "6mm", letterSpacing: "0.05em" }}>
                        『{book.title}』
                      </p>
                    )}
                    <ol style={{ padding: 0, listStyle: "none" }}>
                      {qs.map((q, i) => (
                        <li key={i} style={{ display: "flex", gap: "12px", marginBottom: "5mm" }}>
                          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#C8956C", flexShrink: 0, minWidth: "16px", paddingTop: "2px" }}>
                            {i + 1}.
                          </span>
                          <p style={{ fontSize: "12.5px", lineHeight: "2.0", color: "#2C2520" }}>{q}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: "auto", paddingTop: "6mm", borderTop: "1px solid #EDE8E2", display: "flex", justifyContent: "space-between" }}>
              <p style={{ fontSize: "9px", color: "#C8BEB4", letterSpacing: "0.15em" }}>책피바라</p>
              <p style={{ fontSize: "9px", color: "#C8BEB4", letterSpacing: "0.1em" }}>{formatDate(meeting.date)}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
