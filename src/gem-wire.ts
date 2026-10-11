/** Native CSRGem string IDs go through strtod; integer JSON loads exact64 bits.
 * Storage uses decimal strings; wire emits unsafe IDs as exact integer tokens. */
export function gemWireRows(rows:readonly Record<string,unknown>[]) {
  return rows.map(raw=>{
    const row=structuredClone(raw);
    for(const key of ["inst_id","target_inst_id"]) {
      const value=row[key];
      if(typeof value==="string" && /^(?:0|[1-9]\d*)$/.test(value) && BigInt(value)>BigInt(Number.MAX_SAFE_INTEGER)) {
        const codec=JSON as typeof JSON&{rawJSON?:(text:string)=>unknown};
        if(!codec.rawJSON) throw new TypeError("Exact native Gem integer serialization requires JSON.rawJSON support");
        row[key]=codec.rawJSON(value);
      }
    }
    return row;
  });
}
/** Preserve large numeric Gem IDs in imported state before JS rounds them.
 * Other state numbers/IDs are unchanged; malformed/unsupported input refuses. */
export function parseStateWithGemIds(source:string):unknown {
  return JSON.parse(source,function(key,value,context?:{source:string}) {
    const gem=this && typeof this==="object" && Object.hasOwn(this,"ref_id") && Object.hasOwn(this,"ability") &&
      Object.hasOwn(this,"abilities") && Object.hasOwn(this,"position") && Object.hasOwn(this,"target_inst_id");
    if(gem && ["inst_id","target_inst_id"].includes(key) && typeof value==="number" && !Number.isSafeInteger(value)) {
      if(!context?.source || !/^(?:0|[1-9]\d*)$/.test(context.source)) throw new TypeError("Unrecoverable numeric Gem identity");
      return context.source;
    }
    return value;
  });
}
