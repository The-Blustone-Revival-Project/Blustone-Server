import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {repositoryPath} from "./paths.js";

export const ADVANCEMENT_GOLD_PROFILE=process.env.BLUSTONE_ADVANCEMENT_GOLD_PROFILE??"legacy";
export const ADVANCEMENT_GOLD_EVIDENCE={path:"resources/reference/advancement-screen-quotes.json",sha256:"05778a93c35d63b2bfd02200e79c445c3c56850ed1e4f9c744f946fcfd40c424"} as const;
export function advancementGoldEvidence() {
  const bytes=readFileSync(repositoryPath(ADVANCEMENT_GOLD_EVIDENCE.path));
  if(createHash("sha256").update(bytes).digest("hex")!==ADVANCEMENT_GOLD_EVIDENCE.sha256)throw new TypeError("Advancement image evidence pin changed");
  return JSON.parse(bytes.toString("utf8"));
}
/** Effective historical screen fees projected into LOCAL raw vectors. Guild
 * state in the images is unknown: these are not recovered undiscounted prices.
 * Rank1/2 and level training remain their old fixtures. Guild adjustments are
 * still applied per real source by the existing native-matched fee helper. */
export function createTrainingPrices(profile:string) {
  if(profile==="legacy")return {level:[100],rank:[1000]};
  if(profile!=="screenshot-effective-quote-projection")throw new TypeError("Unknown advancement gold profile");
  const evidence=advancementGoldEvidence();
  const effective=(idx:number,rank:number,count:number)=>{
    const row=evidence.quotes?.find((quote:any)=>quote.idx===idx);
    if(!row||row.source_rank!==rank||row.real_source_count!==count||!Number.isInteger(row.observed_total_fee)||
      row.observed_total_fee<1||row.observed_total_fee%count!==0||row.effective_unit_fee!==row.observed_total_fee/count)
      throw new TypeError("Advancement effective quote anchor is inconsistent");
    return row.effective_unit_fee as number;
  };
  const rank3=effective(1995,3,3),rank4=effective(1426,4,1);
  if(effective(1535,4,1)!==rank4)throw new TypeError("Advancement repeated one-source quotes disagree");
  return {level:[100],rank:[1000,1000,rank3,rank4]};
}
