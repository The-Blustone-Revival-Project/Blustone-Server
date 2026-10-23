/** Native CPVMsg wrappers/row fields; local no-attachment victory notification.
 * No external messaging, attachment grants, or original mail-table claims. */
export interface LocalMail {
  id: number; content: string; created_datetime: number; is_read: number; is_archived: number;
}
export interface MailState { next_id: number; victory_notice_sent: boolean; received: LocalMail[]; deleted: number[] }
// LOCAL display identity, below the account allocator's 1000001 start. Native
// ParseMsgInfo falls back to recipient whenever sender_pvid is zero (G7ffe90).
// This is not a registered/authenticatable account or an original admin ID.
export const LOCAL_MAIL_SENDER = { pvid: 1, nickname: "Local replica" } as const;
export const LOCAL_MAIL_PORTRAIT_PATH = "/local-profile/replica-100.png";
export const emptyMail = (): MailState => ({ next_id: 1, victory_notice_sent: false, received: [], deleted: [] });
const MAX_ID = 0xffffffff;
const MAX_ROWS = 100;
const integer = (raw: unknown) => typeof raw === "number" ? raw :
  typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;
export function normalizeMail(raw: unknown): MailState {
  if (raw === undefined) return emptyMail();
  const state = raw as MailState;
  if (!state || !Number.isSafeInteger(state.next_id) || state.next_id < 1 || state.next_id > MAX_ID ||
      typeof state.victory_notice_sent !== "boolean" || !Array.isArray(state.received) || state.received.length > MAX_ROWS ||
      state.received.some((row) => !row || !Number.isSafeInteger(row.id) || row.id < 1 || row.id >= state.next_id ||
        typeof row.content !== "string" || !row.content || row.content.length > 1024 ||
        !Number.isSafeInteger(row.created_datetime) || row.created_datetime < 0 || row.created_datetime > MAX_ID ||
        ![0, 1].includes(row.is_read) || ![0, 1].includes(row.is_archived)) ||
      new Set(state.received.map((row) => row.id)).size !== state.received.length)
    throw new Error("Malformed mailbox state");
  const deleted = state.deleted ?? [];
  if (!Array.isArray(deleted) || deleted.length > MAX_ROWS ||
      deleted.some((id) => !Number.isSafeInteger(id) || id < 1 || id >= state.next_id || state.received.some((row) => row.id === id)) ||
      new Set(deleted).size !== deleted.length) throw new Error("Malformed mailbox deletion state");
  return structuredClone({ ...state, deleted });
}
export function recordVictoryNotice(state: MailState, stage: string, now: number): boolean {
  // LOCAL Unix-seconds timestamp, not a recovered original epoch policy.
  const created = Math.floor(now / 1000);
  if (state.victory_notice_sent || state.received.length >= MAX_ROWS || state.next_id >= MAX_ID ||
      !Number.isSafeInteger(created) || created < 0 || created > MAX_ID) return false;
  state.received.push({ id: state.next_id++, content:
    `Local revival notice: expedition ${stage} completed. Its rewards were already applied to your account. This message has no attachment.`,
    created_datetime: created, is_read: 0, is_archived: 0 });
  state.victory_notice_sent = true;
  return true;
}
const unread = (state: MailState) => state.received.filter((row) => !row.is_read && !row.is_archived).length;
export function mailboxRequest(route: string, payload: Record<string, unknown>, state: MailState,
    pvid: number, nickname: string, persist: () => void): { data: Record<string, unknown> } | { error: string } {
  if (route === "/message/GetUnreadCount") return { data: { unread_count: unread(state) } };
  if (route === "/message/GetReceivedList" || route === "/message/GetSentList") {
    const start = integer(payload.start ?? 0), length = integer(payload.length ?? 20);
    const after = integer(payload.after ?? 0), before = integer(payload.before ?? 0);
    if (![start, length, after, before].every(Number.isSafeInteger) || start < 0 || length < 1 || length > MAX_ROWS || after < 0 || before < 0)
      return { error: "Invalid mail page" };
    // LOCAL offset/ID-bound paging. Original bound policy remains unknown.
    const rows = route.endsWith("GetSentList") ? [] : state.received.filter((row) => !row.is_archived &&
      (!after || row.id > after) && (!before || row.id < before)).sort((a, b) => b.id - a.id).slice(start, start + length);
    return { data: { unread_count: unread(state), list: rows.map((row) => ({ ...row,
      sender_pvid: LOCAL_MAIL_SENDER.pvid, sender_nickname: LOCAL_MAIL_SENDER.nickname, receiver_pvid: pvid, receiver_nickname: nickname,
      from_admin: 1, app_code: "_SR", attachment: null, is_attachment_taken: 1 })) } };
  }
  if (route === "/message/Read" || route === "/message/Archive") {
    const id = integer(payload.target_list);
    if (!Number.isSafeInteger(id) || id < 1) return { error: "Mail requires one decimal target ID" };
    const row = state.received.find((row) => row.id === id);
    if (!row) return { error: "Owned message not found" };
    const field = route.endsWith("Read") ? "is_read" : "is_archived";
    if (!row[field]) {
      row[field] = 1;
      try { persist(); }
      catch (error) { row[field] = 0; throw error; }
    }
    return { data: { unread_count: unread(state), target_list: [id] } };
  }
  if (route === "/message/RemoveReceived") {
    // CSRSyncMail::ReqRemove appends a comma after every decimal ID.
    // LOCAL policy: settle the whole owned batch atomically; remember deletions
    // so a lost-response retry survives restart without accepting unknown IDs.
    const raw = payload.target_list;
    if (typeof raw !== "string" || !/^\d+(?:,\d+)*,?$/.test(raw)) return { error: "Mail requires decimal target IDs" };
    const ids = [...new Set(raw.replace(/,$/, "").split(",").map(integer))];
    if (ids.length > MAX_ROWS || ids.some((id) => !Number.isSafeInteger(id) || id < 1 ||
        (!state.received.some((row) => row.id === id) && !state.deleted.includes(id))))
      return { error: "Owned messages not found" };
    const fresh = ids.filter((id) => !state.deleted.includes(id));
    if (state.deleted.length + fresh.length > MAX_ROWS) return { error: "Mailbox deletion capacity reached" };
    if (fresh.length) {
      const previousReceived = state.received, previousDeletedLength = state.deleted.length;
      state.received = state.received.filter((row) => !ids.includes(row.id));
      state.deleted.push(...fresh);
      try { persist(); }
      catch (error) {
        state.received = previousReceived;
        state.deleted.length = previousDeletedLength;
        throw error;
      }
    }
    return { data: { unread_count: unread(state), target_list: ids } };
  }
  return { error: "Mail operation or attachment is not reconstructed" };
}
