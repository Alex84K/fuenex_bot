import packageJson from "../../package.json";

/**
 * Commit sha проставляется на деплое (Bun сам грузит .env):
 *   GIT_SHA=$(git rev-parse --short HEAD)
 * Если не задан — метаданные несут только версию, без привязки к билду.
 */
const gitSha = process.env.GIT_SHA;

const componentVersion = gitSha
  ? `${packageJson.version}+${gitSha}`
  : packageJson.version;

/**
 * Маркер рендерера в метаданных Angebot-PDF (ADR-009, Решение 1).
 *
 * Angebot умеют рендерить ДВА разных рендерера: этот (bun, primary) и клиентский
 * `OfferPdfDocument` в home_build_client (offline-fallback, ADR-007 Решение 4).
 * Они дают разный PDF, поэтому в метаданных нужна не только версия, но и то,
 * КТО сгенерировал документ.
 *
 * Пишем в метаданные, а не в видимый футер: Angebot — исходящий документ
 * Handwerksbetrieb на их фирменном бланке, build-строка на нём видна Bauherr'у.
 */
export const PDF_PRODUCER = `fuenexsoft-bun ${componentVersion}`;
