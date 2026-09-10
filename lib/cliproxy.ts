import { requireEnv } from "@/lib/env";

// 자체 서버(Oracle VM)의 CLIProxyAPI 는 구독 계정을 붙였다 뗐다 하는 곳이다.
// 어떤 모델이 뜨는지는 서버에 로그인된 계정에 따라 그때그때 달라지므로,
// 목록을 코드에 박지 않고 /v1/models 에서 받아온다.

export type OracleModel = {
  id: string;
  label: string;
  /** 응답의 owned_by. 계정 종류를 그대로 반영한다(anthropic, antigravity, ...). */
  ownedBy: string;
  /** 사람이 읽는 묶음 이름. owned_by 를 한글로 옮긴 것. */
  group: string;
  /** 실제 호출 확인 결과. 확인한 적이 없으면 null. */
  available: boolean | null;
  /** available === false 일 때 서버가 준 거절 사유. */
  reason?: string;
};

const GROUP_LABEL: Record<string, string> = {
  anthropic: "Anthropic 구독",
  antigravity: "Google Antigravity",
  openai: "OpenAI",
  gemini: "Google Gemini",
};

/** owned_by 를 모르는 값이면 그대로 보여준다. 숨기면 새 제공자가 붙었을 때 눈치채지 못한다. */
function groupOf(ownedBy: string): string {
  return GROUP_LABEL[ownedBy] ?? ownedBy;
}

const WORD_CASE: Record<string, string> = { gpt: "GPT", oss: "OSS", ai: "AI", xai: "xAI" };

/**
 * 모델 id 를 읽을 수 있는 이름으로 바꾼다.
 * claude-opus-4-6-thinking → Claude Opus 4.6 Thinking
 * claude-haiku-4-5-20251001 → Claude Haiku 4.5 (20251001)
 * gpt-oss-120b-medium → GPT OSS 120B Medium
 */
export function modelLabel(id: string): string {
  const dated = id.match(/^(.*)-(\d{8})$/);
  const base = dated ? dated[1] : id;

  const isNum = (s: string) => /^\d+(\.\d+)*$/.test(s);
  const parts: string[] = [];
  for (const p of base.split("-")) {
    // 끊어진 버전 번호를 되붙인다: opus-4-6 → opus 4.6
    if (isNum(p) && parts.length > 0 && isNum(parts[parts.length - 1])) {
      parts[parts.length - 1] += `.${p}`;
    } else {
      parts.push(p);
    }
  }

  const text = parts
    .map((p) => WORD_CASE[p] ?? (/^\d/.test(p) ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1)))
    .join(" ");

  return dated ? `${text} (${dated[2]})` : text;
}

type RawModel = { id?: unknown; owned_by?: unknown };

function baseUrl(): string {
  return requireEnv("CLIPROXY_BASE_URL").replace(/\/+$/, "");
}

/** 프록시가 지금 광고하는 모델 목록. */
export async function listOracleModels(): Promise<OracleModel[]> {
  const key = requireEnv("CLIPROXY_API_KEY");
  const res = await fetch(`${baseUrl()}/v1/models`, {
    headers: { Authorization: `Bearer ${key}` },
    // 목록은 서버 상태를 그대로 비춰야 한다. 캐시는 아래 probe 쪽에서만 한다.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`모델 목록 조회 실패 (HTTP ${res.status})`);
  }

  const body: unknown = await res.json();
  const rows = (body as { data?: RawModel[] })?.data;
  if (!Array.isArray(rows)) throw new Error("모델 목록 응답 형식이 예상과 다릅니다.");

  return rows
    .filter((m): m is { id: string; owned_by?: string } => typeof m?.id === "string")
    .map((m) => {
      const ownedBy = typeof m.owned_by === "string" ? m.owned_by : "unknown";
      return {
        id: m.id,
        label: modelLabel(m.id),
        ownedBy,
        group: groupOf(ownedBy),
        available: probeCache.get(m.id)?.available ?? null,
        reason: probeCache.get(m.id)?.reason,
      };
    })
    .sort((a, b) => a.group.localeCompare(b.group, "ko") || a.id.localeCompare(b.id));
}

// ── 실호출 확인 ─────────────────────────────────────────────
// /v1/models 가 광고해도 실제로는 거절되는 모델이 있다.
// (구독에 포함되지 않거나, 업스트림이 클라이언트 버전을 걸고 막는 경우)
// 목록만 믿으면 관리자가 고를 수 없는 모델을 고르게 되므로 한 번 찔러본다.

type ProbeResult = { available: boolean; reason?: string; at: number };

const probeCache = new Map<string, ProbeResult>();
const PROBE_TTL_MS = 10 * 60 * 1000;
/** 1GB VM 이다. 스무 개를 한꺼번에 던지지 않는다. */
const PROBE_CONCURRENCY = 4;

async function probeOne(id: string, key: string, origin: string): Promise<ProbeResult> {
  try {
    const res = await fetch(`${origin}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      // 응답은 버리므로 최소 토큰만 받는다.
      body: JSON.stringify({ model: id, max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });
    if (res.ok) return { available: true, at: Date.now() };

    const text = await res.text();
    let reason = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      const message = parsed?.error?.message ?? parsed?.message;
      if (typeof message === "string" && message) reason = message;
    } catch {
      if (text) reason = text.slice(0, 200);
    }
    return { available: false, reason, at: Date.now() };
  } catch (e) {
    return { available: false, reason: e instanceof Error ? e.message : String(e), at: Date.now() };
  }
}

/** 목록의 각 모델에 실제로 요청을 보내 사용 가능 여부를 채운다. TTL 안이면 캐시를 쓴다. */
export async function probeOracleModels(models: OracleModel[]): Promise<OracleModel[]> {
  const key = requireEnv("CLIPROXY_API_KEY");
  const origin = baseUrl();
  const now = Date.now();

  const stale = models.filter((m) => {
    const hit = probeCache.get(m.id);
    return !hit || now - hit.at > PROBE_TTL_MS;
  });

  const queue = [...stale];
  const workers = Array.from({ length: Math.min(PROBE_CONCURRENCY, queue.length) }, async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      probeCache.set(next.id, await probeOne(next.id, key, origin));
    }
  });
  await Promise.all(workers);

  return models.map((m) => {
    const hit = probeCache.get(m.id);
    return hit ? { ...m, available: hit.available, reason: hit.reason } : m;
  });
}
