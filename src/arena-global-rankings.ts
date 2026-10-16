import {localArenaStandings,type ArenaStanding} from './arena-rankings.js';

const U32=0xffff_ffff;
function pageField(raw:unknown,max:number):number {
  const value=typeof raw==='string'&&/^[1-9]\d*$/.test(raw)?Number(raw):raw;
  if(typeof value!=='number'||!Number.isInteger(value)||value<1||value>max)
    throw new TypeError('Global ranking requires positive exact page and bounded page_scale');
  return value;
}
/** Native request fields are U32. The scale100 ceiling, visible-local paging
 * and unchanged established rank gaps are explicit LOCAL admission policy. */
export function globalArenaPage(standings:readonly ArenaStanding[],visibleIds:ReadonlySet<number>,raw:Record<string,unknown>):ArenaStanding[] {
  const read=(key:string)=>{
    const descriptor=Object.getOwnPropertyDescriptor(raw,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))throw new TypeError('Global ranking requires own paging data fields');
    return descriptor.value;
  };
  const page=pageField(read('page'),U32),scale=pageField(read('page_scale'),100),canonical=localArenaStandings(standings);
  if(canonical.some((row,index)=>row.pvid!==standings[index].pvid||row.rank!==standings[index].rank))
    throw new TypeError('Global ranking requires canonical established standings');
  const visible=canonical.filter(row=>visibleIds.has(row.pvid)),start=BigInt(page-1)*BigInt(scale);
  if(start>=BigInt(visible.length))return [];
  return visible.slice(Number(start),Number(start)+scale);
}
