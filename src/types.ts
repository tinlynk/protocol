// SPDX-License-Identifier: MIT
/** Core protocol role values */
export type Role = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  /** Must match a registered ToolDescriptor.name */
  name: string;
  /** Opaque arguments validated against the tool's input schema */
  arguments: unknown;
  /** Correlates tool calls and results */
  callId: string;
}

export type ContentPart =
  | { type: "text"; text: string }
  | ({ type: "tool_call" } & ToolCall)
  | { type: "tool_result"; callId: string; result: unknown; isError?: boolean };

export interface Message {
  id: string;
  role: Role;
  content: ContentPart[];
  timestamp: string; // ISO 8601
  /** App-local annotations; Connect does not forward these to providers. */
  metadata?: Record<string, unknown>;
}

export interface JSONSchema {
  $id?: string;
  $schema?: string;
  type?: string | string[];
  title?: string;
  description?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema | JSONSchema[];
  enum?: unknown[];
  additionalProperties?: boolean | JSONSchema;
  pattern?: string;
  format?: string;
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  patternProperties?: Record<string, JSONSchema>;
  definitions?: Record<string, JSONSchema>;
  [k: string]: unknown; // extension
}

export interface ToolDescriptor {
  name: string; // canonical unique name (namespace.action)
  title?: string;
  description?: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  tools?: ToolDescriptor[];
  stream?: boolean;
  temperature?: number;
  /** App-local annotations; Connect does not forward these to providers. */
  metadata?: Record<string, unknown>;
}

export type ChatStreamEvent =
  | { type: "token"; data: string }
  | { type: "tool_call"; data: ToolCall }
  | { type: "tool_result"; data: { callId: string; result: unknown } }
  | { type: "done"; data?: { usage?: Record<string, unknown> } }
  | { type: "error"; data: { message: string; code?: string } };

export type ErrorCode =
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "rate_limited"
  | "internal_error";

export interface ProtocolError {
  message: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
}
