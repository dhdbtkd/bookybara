/** 환경변수 누락은 호출 전에 막고, 어느 변수인지 그대로 알려준다. */
export class MissingEnvError extends Error {
  constructor(name: string) {
    super(`${name}가 설정되지 않았습니다.`);
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  // 스캐폴딩 기본값(your_..._here)은 미설정으로 취급한다.
  if (!value || /^your_.*_here$/.test(value)) throw new MissingEnvError(name);
  return value;
}
