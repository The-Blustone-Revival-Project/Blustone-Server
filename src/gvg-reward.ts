import {parseGvgReference,type GvgReference,type GvgRewardRegistry} from "./gvg-reference.js";

/** Native GetCurRewardInfo Gab2190 uses signed CP bounds and selects the first
 * wire row with min_cp <= CP < max_cp. No max=-1 sentinel or last-row fallback.
 * A complete independently supplied reference is required; this does not
 * calculate CP, authorize participation, settle rewards or invent a season. */
export function gvgRewardAt(raw:unknown,cp:number,registry?:GvgRewardRegistry):GvgReference["reward"][number]|undefined {
  if(typeof cp!=="number"||!Number.isInteger(cp)||cp< -0x8000_0000||cp>0x7fff_ffff)
    throw new TypeError("GvG reward CP requires exact int32");
  const reference=parseGvgReference(raw,registry);
  return reference.reward.find(row=>row.min_cp<=cp&&cp<row.max_cp);
}
