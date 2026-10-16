import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {repositoryPath} from "./paths.js";

export const TRACE_THRESHOLD_EVIDENCE={
  path:"resources/reference/hunter-trace-image-thresholds-2017-2018.json",
  sha256:"5c1b38f5dcddc4997f2f002a910ba70004efb472e736a620b25591c0e6afe402",
} as const;
interface ThresholdEvidence {
  label:string;release:string;scope:string;
  sources:Record<string,{path:string;sha256:string}>;
  observations:{id:string;source:string;line:number;idx:number;raw_tsv:string}[];
  requirements:{ref_id:string;hunter:string;collect_qty:number;observations:string[]}[];
  excluded:{ref_id:string;hunter:string;reason:string;observations:string[]}[];
}
let cached:ThresholdEvidence|undefined;
function evidence():ThresholdEvidence {
  if(cached)return cached;
  const bytes=readFileSync(repositoryPath(TRACE_THRESHOLD_EVIDENCE.path));
  if(createHash("sha256").update(bytes).digest("hex")!==TRACE_THRESHOLD_EVIDENCE.sha256)
    throw new TypeError("Historical trace requirement evidence pin changed");
  const data=JSON.parse(bytes.toString("utf8")) as ThresholdEvidence;
  const observed=new Set(data.observations.map(row=>row.id)),ids=new Set<string>();
  for(const row of data.requirements){
    if(!/^\d{3}$/.test(row.ref_id)||ids.has(row.ref_id)||!Number.isInteger(row.collect_qty)||row.collect_qty<1||
        row.collect_qty>0xffff_ffff||row.observations.length<2||row.observations.some(id=>!observed.has(id)))
      throw new TypeError("Malformed historical trace requirement");
    ids.add(row.ref_id);
  }
  if(data.excluded.some(row=>ids.has(row.ref_id)))throw new TypeError("Conflicting trace evidence cannot be projected");
  cached=data;return data;
}
/** Detached audit data; raw TSV rows remain evidence, never executable input. */
export function traceThresholdEvidence():ThresholdEvidence {return structuredClone(evidence());}
/** Only individually corroborated base identities; unknown/conflicting rows
 * remain undefined. No rarity-wide extrapolation or new exchange whitelist. */
export function historicalTraceQuantity(refId:string):number|undefined {
  return evidence().requirements.find(row=>row.ref_id===refId)?.collect_qty;
}
