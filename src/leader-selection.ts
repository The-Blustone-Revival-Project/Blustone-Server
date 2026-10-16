import type {LocalGameState} from "./game.js";

/** Native request IDs are U64. Persisted local card identities remain exact
 * positive safe Numbers; wide unknown requests cannot alias a local card. */
export function planLeaderSelection(rawTarget:unknown,game:LocalGameState,knownRefs:ReadonlySet<string>) {
  const token=typeof rawTarget==="number"&&Number.isSafeInteger(rawTarget)&&rawTarget>0?String(rawTarget):
    typeof rawTarget==="string"?rawTarget:"";
  if(!/^[1-9]\d*$/.test(token)||token.length>20||BigInt(token)>0xffff_ffff_ffff_ffffn)
    throw new TypeError("Leader selection requires a canonical positive uint64 identity");
  const owned=new Map<string,{inst_id:number;ref_id:string}>();
  for(const card of [...game.starter_cards,...game.recruited_cards]) {
    if(!card||typeof card!=="object"||!Number.isSafeInteger(card.inst_id)||card.inst_id<=0||owned.has(String(card.inst_id)))
      throw new TypeError("Leader selection owned identities are malformed or ambiguous");
    owned.set(String(card.inst_id),card);
  }
  const target=owned.get(token);
  if(!target)throw new TypeError("Leader selection target is not owned");
  if(typeof target.ref_id!=="string"||!target.ref_id||Buffer.from(target.ref_id,"utf8").toString("utf8")!==target.ref_id||!knownRefs.has(target.ref_id))
    throw new TypeError("Leader selection requires a published owned reference");
  const changed=game.leader_inst_id!==target.inst_id;
  // Original mid-battle admission was not recovered. Keep active participants
  // stable as explicit LOCAL policy; retries of the current selection are safe.
  if(changed&&(game.active_battle?.state==="active"||game.search.active||game.arena.active))
    throw new TypeError("Leader selection changes are unavailable during an active battle");
  return {leader_inst_id:target.inst_id,changed};
}
