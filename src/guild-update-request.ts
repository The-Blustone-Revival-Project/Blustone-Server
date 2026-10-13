import {parseGuildFoundRequest,type GuildFoundRequest} from "./guild-found-request.js";
export type GuildUpdateRequest=GuildFoundRequest;
/** RequestModify Ga7a408 sends the same six structural fields as Found, but
 * targets the authenticated actor's existing affiliation implicitly. Parsing
 * creates no permission, payment, new Guild ID or membership authority.
 * Shared text/enum/count admission is replica policy, not original server rules. */
export function parseGuildUpdateRequest(raw:unknown,knownEmblems:ReadonlySet<string>):GuildUpdateRequest {
  return parseGuildFoundRequest(raw,knownEmblems);
}
