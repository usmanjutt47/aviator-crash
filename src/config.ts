import appConfig from "./config.json";

const removeTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const toApiUrl = (value: string) => {
  const cleaned = removeTrailingSlash(value);
  return /\/api$/i.test(cleaned) ? cleaned : `${cleaned}/api`;
};

const toSocketUrl = (value: string) => {
  const cleaned = removeTrailingSlash(value);
  return cleaned.replace(/\/api$/i, "");
};

const envApiBase = process.env.REACT_APP_API_URL?.trim();
const hasEnvApi = Boolean(envApiBase);

const fallbackApiBase = appConfig.development
  ? appConfig.development_api
  : appConfig.production_api;

const fallbackSocketBase = appConfig.development
  ? appConfig.development_wss
  : appConfig.production_wss;

const localSocketBase = toSocketUrl(appConfig.development_api);
const isLocalHostRuntime =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1"].includes(window.location.hostname);

const resolvedApiBase = hasEnvApi ? envApiBase! : fallbackApiBase;
const resolvedSocketBase = hasEnvApi
  ? envApiBase!
  : isLocalHostRuntime && appConfig.development
    ? localSocketBase
    : fallbackSocketBase;

export const config = {
  development: appConfig.development,
  debug: appConfig.debug,
  appKey: appConfig.appKey,
  api: toApiUrl(resolvedApiBase),
  wss: toSocketUrl(resolvedSocketBase),
};
