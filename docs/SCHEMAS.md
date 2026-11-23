# Protocol Schemas

This document describes the JSON Schemas shipped by @tinlynk/protocol.
Each schema is a stable wire contract and should be treated as source-of-truth for validation.

## Overview

Schemas live under `protocol/schemas/` and are shipped in the published package.
Use them to validate incoming or outgoing payloads at service boundaries.

## message.schema.json

Purpose: Defines a single chat message exchanged between clients, models, and tools.

Key fields:
- id: Unique identifier for the message.
- role: Message author identity.
  - system: High-priority instruction layer.
  - user: Human input.
  - assistant: Model response.
  - tool: Output from a tool execution.
- content: The message body, plain text or markdown.
- timestamp: ISO 8601 date-time string.
- toolCall: Optional tool invocation payload used when the assistant requests tool execution.
- metadata: Optional key-value pair for app-specific information.

Constraints:
- Required: id, role, content, timestamp.
- toolCall must include name, arguments, callId and forbids extra fields.
- additionalProperties is false at the top level to keep the payload tight.

## tool-descriptor.schema.json

Purpose: Describes a tool that can be advertised to or invoked by a model.

Key fields:
- name: Unique tool identifier, typically namespace.action.
- title: Short display name for UIs.
- description: Longer description of what the tool does.
- inputSchema: JSON Schema for tool arguments.
- outputSchema: Optional JSON Schema for tool output.

Constraints:
- Required: name, inputSchema.
- additionalProperties is false to ensure consistent tool definitions.

## chat-request.schema.json

Purpose: Represents a model request including messages and optional tool definitions.

Key fields:
- model: Target model name, usually provider:model.
- messages: Array of Message entries.
- tools: Optional list of ToolDescriptor entries.
- stream: Optional boolean to request streamed responses.
- temperature: Optional number controlling randomness.
- metadata: Optional key-value bag for request-scoped data.

Constraints:
- Required: model, messages.
- messages must contain at least one entry.
- additionalProperties is false for stability.

## chat-stream-event.schema.json

Purpose: Defines the streaming event contract emitted during model responses.

Variants:
- token: Token string emitted by the model.
- tool_call: Structured tool invocation request.
- tool_result: Tool execution result payload.
- done: Stream completion marker with optional usage.
- error: Structured error payload for stream failures.

Constraints:
- Uses oneOf to enforce the exact variant shapes.
- Each variant has a fixed type discriminator.
- additionalProperties is false per variant to prevent ambiguous payloads.

## Schema Compatibility

- Schemas follow SemVer along with the protocol package.
- Breaking changes require a major version bump.
- Additive fields should be optional and documented.

## Validation Tips

- Validate at system boundaries before persisting or executing.
- Log only actionable validation failures.
- Keep user-facing error messages short and clear.
