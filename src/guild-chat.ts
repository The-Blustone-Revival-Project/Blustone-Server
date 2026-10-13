import type {Server} from "node:http";
import type {ServerState} from "./state.js";
import {attachLocalChat} from "./chat-service.js";
/** Compatibility entry point; all enabled Chat endpoints share one dispatcher. */
export function attachGuildChat(server:Server,state:ServerState) {
  if(!state.guildChatEnabled()) throw new Error("Guild Chat listener requires explicit local-memory mode");
  return attachLocalChat(server,state);
}
