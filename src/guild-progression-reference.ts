export const GUILD_BENEFIT_KEYS=["equipment_level_up","gem_level_up","traning","intrust","ap"] as const;
type BenefitKey=typeof GUILD_BENEFIT_KEYS[number];
export type GuildLevelBenefit={level:number;contribution:number}&Partial<Record<BenefitKey,number>>;
export type GuildBenefitStrings=Partial<Record<BenefitKey,string>>;
export interface GuildContributionReward {contribution:number;reward:{ap?:number;gold?:number;item_list?:{id:string;qty:number}[]}}
function object(raw:unknown,keys:readonly string[]) {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.keys(raw).some(key=>!keys.includes(key))) throw new TypeError("Unsupported Guild progression reference fields");
  return raw as Record<string,unknown>;
}
function uint(value:unknown) {
  if(typeof value!=="number"||!Number.isInteger(value)||value<0||value>0xffff_ffff) throw new TypeError("Guild reference requires exact uint32");
  return value;
}
/** Explicit base0/threshold0 and strict wire order avoid the native empty-list
 * sentinel and unclosed missing-level fallback. No rows are invented/sorted. */
export function guildLevelBenefits(raw:unknown):GuildLevelBenefit[] {
  if(!Array.isArray(raw)||!raw.length) throw new TypeError("Guild levels require an explicit nonempty table");
  let previousLevel=-1,previousContribution=-1;
  return raw.map((value,index)=>{
    const row=object(value,["level","contribution",...GUILD_BENEFIT_KEYS]),level=uint(row.level),contribution=uint(row.contribution);
    if((index===0&&(level!==0||contribution!==0))||level<=previousLevel||contribution<=previousContribution)
      throw new TypeError("Guild levels require base0 and strictly increasing wire levels/thresholds");
    previousLevel=level;previousContribution=contribution;
    const result:GuildLevelBenefit={level,contribution};
    for(const key of GUILD_BENEFIT_KEYS) if(Object.hasOwn(row,key)) result[key]=uint(row[key]);
    return result;
  });
}
export function guildBenefitStrings(raw:unknown):GuildBenefitStrings {
  const row=object(raw,GUILD_BENEFIT_KEYS),result:GuildBenefitStrings={};
  for(const key of GUILD_BENEFIT_KEYS) if(Object.hasOwn(row,key)) {
    const value=row[key];if(typeof value!=="string"||Buffer.from(value,"utf8").toString("utf8")!==value) throw new TypeError("Guild benefit description requires lossless string");
    result[key]=value;
  }
  return result;
}
export function guildContributionPoints(raw:unknown):Record<string,number> {
  const row=object(raw,["1","2","3","4"]),result:Record<string,number>={};
  for(const key of ["1","2","3","4"]) {
    const value=row[key];if(typeof value!=="number"||!Number.isInteger(value)||value< -0x8000_0000||value>0x7fff_ffff)
      throw new TypeError("Guild action points require all four exact signed32 values");
    result[key]=value;
  }
  return result;
}
export function guildContributionRewards(raw:unknown,knownItems:ReadonlySet<string>):GuildContributionReward[] {
  if(!Array.isArray(raw)||!raw.length) throw new TypeError("Guild reward references require a positive nonempty mileage table");
  const seen=new Set<number>();
  const rows=raw.map(value=>{
    const row=object(value,["contribution","reward"]),contribution=uint(row.contribution),source=object(row.reward,["ap","gold","item_list"]);
    if(seen.has(contribution)) throw new TypeError("Duplicate Guild contribution threshold");seen.add(contribution);
    const reward:GuildContributionReward["reward"]={};
    for(const key of ["ap","gold"] as const) if(Object.hasOwn(source,key)) reward[key]=uint(source[key]);
    if(Object.hasOwn(source,"item_list")) {
      if(!Array.isArray(source.item_list)) throw new TypeError("Guild reward item_list requires rows");
      reward.item_list=source.item_list.map(value=>{
        const item=object(value,["id","qty"]);
        if(typeof item.id!=="string"||!knownItems.has(item.id)) throw new TypeError("Guild reward item lacks known original reference");
        return {id:item.id,qty:uint(item.qty)};
      });
    }
    return {contribution,reward};
  });
  if(!rows.some(row=>row.contribution>0)) throw new TypeError("Guild mileage maximum cannot be zero");
  return rows;
}
export function selectedGuildBenefit(rows:readonly GuildLevelBenefit[],contribution:number,key:BenefitKey) {
  uint(contribution);
  if(!rows.length||rows[0].level!==0||rows[0].contribution!==0) throw new TypeError("Guild benefit selection requires valid explicit base table");
  let selected=rows[0];
  if(contribution>0) for(const row of rows) {if(row.contribution>contribution) break;selected=row;}
  return Object.hasOwn(selected,key)?{mode:key==="ap"?0:1,value:selected[key]!}:null;
}
