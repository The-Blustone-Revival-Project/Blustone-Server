import type { RequestHandler } from "express";
import type { RouteDefinition } from "./routes.js";
import {NativeAuthError,type ServerState} from "./state.js";
import {renderProfilePage} from "./profile-page.js";

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
    const data = { accepted: false, claimed: false, items: [] };
    // Cached route names do not establish current event policy, ownership or
    // settlement. This provisional LOCAL refusal is not an original error code
    // or a native game RPC contract, and performs no account/game lookup.
    return res.json({
      result_code: 2001,
      success: false,
      message: "This WebView operation is unavailable in the local revival.",
      ret_data: data,
      data,
      replica: true,
      evidence_route: route,
      request_keys: keys,
    });
  };
}

export function webviewRouteDefinitions(state:ServerState): RouteDefinition[] {
  const fixtures=webviewEvidenceRoutes.map((path) => ({
    method: "post" as const,
    path,
    name: `webview-evidence-${path.slice("/webview/".length).replaceAll("/", "-")}`,
    handler: fixtureHandler(path),
  }));
  const profile:RouteDefinition[]=[
    {method:"get",path:"/webview/my-info",name:"local-profile-page",handler:(req,res,next)=>{
      try{
        const view=state.webProfile(req.query.web_token);
        res.setHeader("Referrer-Policy","no-referrer");
        res.setHeader("Content-Security-Policy","default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
        return res.type("html").send(renderProfilePage(view,req.query.web_token as string));
      }catch(error){if(error instanceof NativeAuthError)return res.status(403).json(state.failure(error.code,error.message));next(error);}
    }},
    {method:"post",path:"/webview/my-info/update",name:"local-profile-update",handler:(req,res,next)=>{
      try{return res.json(state.updateWebProfile(req.body?.web_token,req.body?.patch));}
      catch(error){if(error instanceof NativeAuthError)return res.status(403).json(state.failure(error.code,error.message));next(error);}
    }},
  ];
  return [...fixtures,...profile];
}
