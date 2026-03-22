import {
  Document, Page, Text, View, Image, Font, StyleSheet,
} from "@react-pdf/renderer";

// ── 폰트 등록 ──────────────────────────────────────────────
Font.register({
  family: "BookkMyungjo",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Lt.woff2",
      fontWeight: "normal",
    },
    {
      src: "https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2302@1.0/BookkMyungjo-Bd.woff2",
      fontWeight: "bold",
    },
  ],
});

// 하이픈 없이 줄바꿈
Font.registerHyphenationCallback((word) => [word]);

// ── 타입 ───────────────────────────────────────────────────
export type PdfBook = {
  id: number; title: string; author: string;
  cover_url: string | null; cover_url_hires: string | null;
};
export type PdfReview = {
  id: number; author_name: string; content: string; book_id: number;
};
export type PdfMeeting = {
  id: number; title: string; date: string; location: string | null;
  books: PdfBook[];
};
export type PdfQuestion = {
  id: number; book_id: number; questions: string;
};

// ── 유틸 ───────────────────────────────────────────────────
function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${weekdays[d.getDay()]})`;
}

// ── 스타일 ─────────────────────────────────────────────────
const C = {
  brown:    "#1C1A17",
  rust:     "#8B3A2A",
  terracotta: "#C8956C",
  muted:    "#9C8E7E",
  warm:     "#6B5E52",
  line:     "#D4C5B0",
  cream:    "#FDFAF7",
  paper:    "#F0EAE0",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 55, paddingBottom: 50, paddingHorizontal: 52,
    fontFamily: "BookkMyungjo", fontSize: 11, color: C.brown, backgroundColor: "white",
  },
  coverPage: {
    paddingTop: 55, paddingBottom: 50, paddingHorizontal: 52,
    fontFamily: "BookkMyungjo", fontSize: 11, color: C.brown, backgroundColor: C.cream,
    display: "flex", flexDirection: "column", justifyContent: "space-between",
  },

  // ── 표지 ──
  coverTop: { alignItems: "center", paddingTop: 20 },
  coverLabel: { fontSize: 8, letterSpacing: 4, color: C.rust, fontWeight: "bold", marginBottom: 8 },
  coverClub: { fontSize: 36, fontWeight: "bold", color: C.brown, letterSpacing: 6, marginBottom: 4 },
  coverLine: { width: 100, height: 1.5, backgroundColor: C.terracotta, marginTop: 12, marginBottom: 0 },

  coverMid: { alignItems: "center", flex: 1, justifyContent: "center" },
  coverMeetingTitle: { fontSize: 13, color: C.warm, letterSpacing: 3, marginBottom: 20, textAlign: "center" },
  coverCovers: { flexDirection: "row", gap: 16, justifyContent: "center", marginBottom: 18 },
  coverBookImg: { width: 130, height: 190, objectFit: "cover", borderRadius: 3 },
  coverBookTitle: { fontSize: 16, fontWeight: "bold", color: C.brown, textAlign: "center", marginBottom: 4 },
  coverBookAuthor: { fontSize: 11, color: C.muted, textAlign: "center" },
  coverBookGroup: { alignItems: "center", marginBottom: 4 },

  coverBottom: { alignItems: "center", paddingBottom: 10 },
  coverHr: { width: "100%", height: 0.75, backgroundColor: C.line, marginBottom: 12 },
  coverDate: { fontSize: 11, color: C.warm, letterSpacing: 2, marginBottom: 10 },
  coverMembers: { fontSize: 10, color: C.muted, letterSpacing: 2 },

  // ── 독후감 페이지 ──
  reviewHeader: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    borderBottomWidth: 1.5, borderBottomColor: C.brown, paddingBottom: 12, marginBottom: 22,
  },
  reviewMeta: { fontSize: 8, letterSpacing: 3, color: C.rust, marginBottom: 6 },
  reviewAuthor: { fontSize: 24, fontWeight: "bold", color: C.brown, marginBottom: 5 },
  reviewBookLabel: { fontSize: 10, color: C.muted },
  reviewCover: { width: 44, height: 64, objectFit: "cover", borderRadius: 2 },

  reviewBody: { fontSize: 11.5, lineHeight: 2.1, color: "#2C2520" },
  reviewPara: { marginBottom: 6, textIndent: 14 },

  footer: {
    position: "absolute", bottom: 28, left: 52, right: 52,
    borderTopWidth: 0.5, borderTopColor: C.line,
    flexDirection: "row", justifyContent: "space-between", paddingTop: 7,
  },
  footerText: { fontSize: 8, color: "#C8BEB4", letterSpacing: 2 },

  // ── 토론 질문 ──
  questionItem: { flexDirection: "row", gap: 10, marginBottom: 18 },
  questionNum: { fontSize: 11, fontWeight: "bold", color: C.terracotta, width: 18, flexShrink: 0 },
  questionText: { fontSize: 11.5, lineHeight: 1.9, color: "#2C2520", flex: 1 },
  bookGroupTitle: { fontSize: 11, fontWeight: "bold", color: C.warm, marginBottom: 14, letterSpacing: 2 },
});

// ── 공통 Footer ────────────────────────────────────────────
function Footer({ date, meeting }: { date: string; meeting: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>책피바라</Text>
      <Text style={s.footerText}>{meeting}</Text>
      <Text style={s.footerText}>{formatDate(date)}</Text>
    </View>
  );
}

// ── PDF Document ───────────────────────────────────────────
interface Props {
  meeting: PdfMeeting;
  reviews: PdfReview[];
  questions: PdfQuestion[];
  selectedMembers: string[];
}

export default function ReviewPdfDocument({ meeting, reviews, questions, selectedMembers }: Props) {
  const selectedReviews = reviews.filter((r) => selectedMembers.includes(r.author_name));

  const questionsByBook = new Map<number, string[]>();
  for (const q of questions) {
    const qList: string[] = JSON.parse(q.questions);
    if (!questionsByBook.has(q.book_id)) questionsByBook.set(q.book_id, []);
    questionsByBook.get(q.book_id)!.push(...qList);
  }

  return (
    <Document title={`${meeting.title} — 책피바라`} language="ko">

      {/* ── 표지 ── */}
      <Page size="A4" style={s.coverPage}>
        {/* 상단 클럽명 */}
        <View style={s.coverTop}>
          <Text style={s.coverLabel}>BOOK CLUB</Text>
          <Text style={s.coverClub}>책피바라</Text>
          <View style={s.coverLine} />
        </View>

        {/* 중앙: 책 커버 + 제목 */}
        <View style={s.coverMid}>
          <Text style={s.coverMeetingTitle}>{meeting.title}</Text>

          <View style={s.coverCovers}>
            {meeting.books.map((book) => {
              const cover = book.cover_url_hires || book.cover_url;
              return cover ? (
                <Image key={book.id} src={cover} style={s.coverBookImg} />
              ) : (
                <View key={book.id} style={[s.coverBookImg, { backgroundColor: C.line, justifyContent: "center", alignItems: "center" }]}>
                  <Text style={{ fontSize: 9, color: C.muted }}>표지 없음</Text>
                </View>
              );
            })}
          </View>

          {meeting.books.map((book) => (
            <View key={book.id} style={s.coverBookGroup}>
              <Text style={s.coverBookTitle}>{book.title}</Text>
              <Text style={s.coverBookAuthor}>{book.author}</Text>
            </View>
          ))}
        </View>

        {/* 하단: 날짜 + 참석자 */}
        <View style={s.coverBottom}>
          <View style={s.coverHr} />
          <Text style={s.coverDate}>
            {formatDate(meeting.date)}{meeting.location ? `   ·   ${meeting.location}` : ""}
          </Text>
          <Text style={s.coverMembers}>{selectedMembers.join("   ·   ")}</Text>
        </View>
      </Page>

      {/* ── 독후감 페이지 (한 명씩, 길면 자동 다음 페이지) ── */}
      {selectedReviews.map((review) => {
        const book = meeting.books.find((b) => b.id === review.book_id);
        const cover = book ? (book.cover_url_hires || book.cover_url) : null;
        const paragraphs = review.content.split("\n").filter((l) => l.trim());

        return (
          <Page key={review.id} size="A4" style={s.page}>
            {/* 헤더 */}
            <View style={s.reviewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={s.reviewMeta}>독후감  ·  책피바라  ·  {meeting.title}</Text>
                <Text style={s.reviewAuthor}>{review.author_name}</Text>
                {book && (
                  <Text style={s.reviewBookLabel}>
                    {book.title}{book.author ? `   ·   ${book.author}` : ""}
                  </Text>
                )}
              </View>
              {cover && <Image src={cover} style={s.reviewCover} />}
            </View>

            {/* 본문 — wrap 덕분에 길면 자동으로 다음 페이지로 */}
            <View style={s.reviewBody}>
              {paragraphs.map((para, i) => (
                <Text key={i} style={s.reviewPara}>{para}</Text>
              ))}
            </View>

            <Footer date={meeting.date} meeting={meeting.title} />
          </Page>
        );
      })}

      {/* ── AI 토론 질문 ── */}
      {questions.length > 0 && (
        <Page size="A4" style={s.page}>
          {/* 헤더 */}
          <View style={[s.reviewHeader, { marginBottom: 26 }]}>
            <View>
              <Text style={s.reviewMeta}>AI 생성  ·  책피바라  ·  {meeting.title}</Text>
              <Text style={s.reviewAuthor}>토론 질문</Text>
            </View>
          </View>

          {/* 도서별 질문 */}
          {meeting.books.map((book) => {
            const qs = questionsByBook.get(book.id) ?? [];
            if (qs.length === 0) return null;
            return (
              <View key={book.id} style={{ marginBottom: 24 }}>
                {meeting.books.length > 1 && (
                  <Text style={s.bookGroupTitle}>『{book.title}』</Text>
                )}
                {qs.map((q, i) => (
                  <View key={i} style={s.questionItem}>
                    <Text style={s.questionNum}>{i + 1}.</Text>
                    <Text style={s.questionText}>{q}</Text>
                  </View>
                ))}
              </View>
            );
          })}

          <Footer date={meeting.date} meeting={meeting.title} />
        </Page>
      )}
    </Document>
  );
}
