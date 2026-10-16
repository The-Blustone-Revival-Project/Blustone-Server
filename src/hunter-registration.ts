/** CSRCard.parse stores regdate as zero-extended uint32 epoch seconds.
 * New owned grants get creation time; old rows and transient actors keep
 * their original dates. This is not a purchase entitlement or timer override. */
export function hunterRegistrationTime(now:number):number {
  if(!Number.isSafeInteger(now)||now<0||Math.floor(now/1000)>0xffff_ffff)
    throw new TypeError("Hunter registration clock must fit uint32 epoch seconds");
  return Math.floor(now/1000);
}
