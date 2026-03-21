export type Book = {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
  description: string | null;
  created_at: string;
};

export type BookCandidate = {
  id: number;
  title: string;
  author: string;
  proposed_by: string;
  notes: string | null;
  status: "pending" | "selected" | "rejected";
  created_at: string;
};

export type Meeting = {
  id: number;
  title: string;
  date: string;
  location: string | null;
  book_id: number | null;
  summary: string | null;
  created_at: string;
};

export type MeetingWithBook = Meeting & {
  books: Book | null;
};

export type Attendee = {
  id: number;
  meeting_id: number;
  name: string;
  created_at: string;
};

export type Review = {
  id: number;
  book_id: number;
  meeting_id: number | null;
  author_name: string;
  content: string;
  created_at: string;
};

export type ReviewWithBook = Review & {
  books: Pick<Book, "title" | "author"> | null;
  meetings: Pick<Meeting, "title" | "date"> | null;
};

export type Announcement = {
  id: number;
  title: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
};

export type DiscussionQuestion = {
  id: number;
  meeting_id: number | null;
  book_id: number | null;
  questions: string;
  is_public: boolean;
  created_at: string;
};
