import { isAdminAuthenticated } from "@/lib/auth";
import { listOracleModels, probeOracleModels } from "@/lib/cliproxy";
import { MissingEnvError } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

/**
 * 자체 서버(CLIProxyAPI)가 지금 서빙하는 모델 목록.
 * ?probe=1 이면 각 모델에 실제로 한 번 요청을 보내 사용 가능 여부까지 채운다.
 * 목록만으로는 거절되는 모델을 걸러낼 수 없어서다.
 */
export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  }

  const probe = new URL(req.url).searchParams.get("probe") === "1";

  try {
    const models = await listOracleModels();
    return NextResponse.json({ models: probe ? await probeOracleModels(models) : models });
  } catch (e) {
    if (e instanceof MissingEnvError) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
    // 자체 서버는 내려갈 수 있다. 목록을 못 받았다는 걸 UI 가 알아야 정적 목록으로 물러선다.
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Oracle 모델 목록 조회 실패: ${detail}` }, { status: 502 });
  }
}
