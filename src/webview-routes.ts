import type { RequestHandler } from "express";
import type { RouteDefinition } from "./routes.js";

/**
 * Form-observed WebView endpoints recovered from the offline cache.
 *
 * These are intentionally separate from the native route catalog: the cached
 * pages prove the form/page contract, but do not prove a native lobby or
 * gameplay response schema.
 */
export const webviewEvidenceRoutes = [
  "/webview/evaluation/GetCardList",
  "/webview/evaluation/RecordCardRecommend",
  "/webview/event_battle/PointReward",
  "/webview/event_battle/WinReward",
  "/webview/event_item_collect/ItemExchangeReward",
  "/webview/event_money_spend/Reward",
  "/webview/event_quest/JoinCamp",
  "/webview/event_quest/Reward",
  "/webview/event_quest/RewardLast",
] as const;

function requestKeys(body: unknown): string[] {
  if (!body || typeof body !== "object" || Array.isArray(body)) return [];
  return Object.keys(body as Record<string, unknown>)
    .filter((key) => !/(token|secret|password|cookie|otp)/i.test(key))
    .sort();
}

function fixtureHandler(route: string): RequestHandler {
  return (req, res) => {
    const keys = requestKeys(req.body);
    const isList = route.endsWith("GetCardList");
    const isReward = /Reward|PointReward|JoinCamp|RecordCardRecommend/.test(route);
    const data = isList ? [] : isReward ? { accepted: true, claimed: true, items: [] } : { accepted: true };
    // result_code == 1 is observed in cached WebView handlers. This envelope
    // is a local fixture and must not be reused as a native API schema.
    return res.json({
      result_code: 1,
      success: true,
      message: "accepted",
      ret_data: data,
      data,
      replica: true,
      evidence_route: route,
      request_keys: keys,
    });
  };
}

export function webviewRouteDefinitions(): RouteDefinition[] {
  return webviewEvidenceRoutes.map((path) => ({
    method: "post" as const,
    path,
    name: `webview-evidence-${path.slice("/webview/".length).replaceAll("/", "-")}`,
    handler: fixtureHandler(path),
  }));
}
