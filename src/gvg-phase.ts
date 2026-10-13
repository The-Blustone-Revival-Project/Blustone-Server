export const GVG_PHASE_TIMES = Object.freeze(["teaser_begin_dtm", "register_begin_dtm", "matching_begin_dtm",
  "deploy_begin_dtm", "combat_begin_dtm", "calc_begin_dtm", "result_begin_dtm", "finish_dtm", "next_gvg_dtm"] as const);
export type GvgScheduleTimes = Record<typeof GVG_PHASE_TIMES[number], number>;
export type GvgPhase = 0|1|2|3|4|5|6|7|8|9;

function seconds(raw: unknown) {
  if(typeof raw!=="number" || !Number.isInteger(raw) || raw< -0x8000_0000 || raw>0xffff_ffff)
    throw new TypeError("GvG phase time requires exact signed32 or uint32 integer bits");
  return raw;
}
/** Extract ONLY nine supplied schedule fields. This is not GetRef validation:
 * ID, camps, rewards and other metadata remain the caller's separate concern.
 * Strict numeric integer admission is local; native loose string conversions
 * are not emulated. Signed32 and uint32 spellings preserve the same low bits;
 * no dates, time zones, recurring seasons or original numeric data are invented. */
export function gvgScheduleTimes(raw: unknown): GvgScheduleTimes {
  if(!raw || typeof raw!=="object" || Array.isArray(raw)) throw new TypeError("Expected GvG schedule object");
  const row=raw as Record<string,unknown>;
  return Object.fromEntries(GVG_PHASE_TIMES.map(key=>[key,seconds(row[key])])) as GvgScheduleTimes;
}
/** Native GetCurGVGPhase Gaab938 tests descending phase priority, strictly
 * AFTER each positive SIGNED marker. Equality remains the preceding phase.
 * Native AddTimeJump/ResetTimeJump is a separate signed debug adjustment, not
 * a timezone. Its addition and clock words wrap as native32-bit arithmetic.
 * No route/state uses this offline selector until full references are admitted. */
export function gvgPhaseTimingAt(raw: unknown, serverSeconds: number, timeJumpSeconds=0): {phase:GvgPhase;nextServerSeconds:number} {
  const times=gvgScheduleTimes(raw),now=seconds(serverSeconds);
  if(!Number.isInteger(timeJumpSeconds) || timeJumpSeconds< -0x8000_0000 || timeJumpSeconds>0x7fff_ffff)
    throw new TypeError("GvG phase time jump must be signed32");
  const adjusted=(now+timeJumpSeconds)|0;
  for(let index=GVG_PHASE_TIMES.length-1;index>=0;index--) {
    const boundary=times[GVG_PHASE_TIMES[index]]|0;
    if(boundary>0 && adjusted>boundary) {
      const phase=(index+1) as GvgPhase;
      return {phase,nextServerSeconds:phase===9?0:(times[GVG_PHASE_TIMES[index+1]]-timeJumpSeconds)|0};
    }
  }
  return {phase:0,nextServerSeconds:0};
}
/** Phase-only convenience; the native pair's second word is an ABSOLUTE server
 * timestamp minus the time jump, not a remaining-seconds countdown. */
export function gvgPhaseAt(raw: unknown, serverSeconds: number, timeJumpSeconds=0): GvgPhase {
  return gvgPhaseTimingAt(raw,serverSeconds,timeJumpSeconds).phase;
}
