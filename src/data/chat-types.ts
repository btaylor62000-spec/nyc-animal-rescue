/**
 * Re-export of the chat wire types for the browser bundle.
 *
 * The protocol lives in src/chat/protocol.ts next to the server that speaks
 * it; this file exists so the client imports types without pulling the
 * server's limits and constants into the page bundle.
 */
export type { ChatCard, ChatEvent } from '../chat/protocol.ts';
