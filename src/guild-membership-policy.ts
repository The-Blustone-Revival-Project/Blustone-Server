/** Required LOCAL admission/initialization choices, never original defaults.
 * Public immediate join / permission approval and wallet-neutral transactions
 * are declared by the opt-in mode. Private invitations remain unsupported. */
export interface GuildMembershipPolicy {maxMembers:number;memberRole:3|4;newbie:0|1}
export function guildMembershipPolicy(raw:unknown):Readonly<GuildMembershipPolicy> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new TypeError("Local Guild membership requires explicit policy");
  const row=raw as Record<string,unknown>;
  if(Object.keys(row).some(key=>!["maxMembers","memberRole","newbie"].includes(key))||
    typeof row.maxMembers!=="number"||!Number.isInteger(row.maxMembers)||row.maxMembers<1||row.maxMembers>40||
    ![3,4].includes(row.memberRole as number)||![0,1].includes(row.newbie as number)||
    (row.newbie===1&&row.memberRole!==4))
    throw new TypeError("Invalid explicit Guild capacity/member role/newbie policy");
  return Object.freeze({maxMembers:row.maxMembers,memberRole:row.memberRole as 3|4,newbie:row.newbie as 0|1});
}
