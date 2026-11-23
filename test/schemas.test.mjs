import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemasDir = join(__dirname, "..", "schemas");

function load(name) {
  return JSON.parse(readFileSync(join(schemasDir, name), "utf8"));
}

// Evaluate the schema keywords used by message content parts.
function matches(schema, value) {
  if (schema.oneOf) {
    return schema.oneOf.filter((variant) => matches(variant, value)).length === 1;
  }
  if ("const" in schema && schema.const !== value) return false;
  if (schema.type === "array") {
    return Array.isArray(value) && value.every((item) => matches(schema.items, item));
  }
  if (schema.type === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    if (schema.required?.some((key) => !Object.hasOwn(value, key))) return false;
    return Object.entries(value).every(([key, item]) => {
      const property = schema.properties?.[key];
      return property ? matches(property, item) : schema.additionalProperties !== false;
    });
  }
  if (schema.type && typeof value !== schema.type) return false;
  if (schema.minLength !== undefined && value.length < schema.minLength) return false;
  return true;
}

test("message schema required fields", () => {
  const schema = load("message.schema.json");
  assert.deepEqual(schema.required, ["id", "role", "content", "timestamp"]);
  assert.equal(schema.additionalProperties, false);
  assert.equal("toolCall" in schema.properties, false);
});

test("message content schema accepts ordered text and correlated tool parts", () => {
  const content = load("message.schema.json").properties.content;
  assert.equal(content.type, "array");
  assert.deepEqual(content.items.oneOf.map((part) => part.properties.type.const), [
    "text", "tool_call", "tool_result",
  ]);
  assert.equal(matches(content, []), true);
  assert.equal(matches(content, [
    { type: "text", text: "Checking" },
    { type: "tool_call", callId: "1", name: "fs.read", arguments: { path: "a" } },
    { type: "tool_call", callId: "2", name: "fs.read", arguments: null },
    { type: "tool_result", callId: "2", result: null, isError: true },
    { type: "tool_result", callId: "1", result: { text: "done" } },
    { type: "text", text: "Finished" },
  ]), true);
});

test("message content schema rejects invalid parts and legacy content", () => {
  const content = load("message.schema.json").properties.content;
  for (const invalid of [
    "text",
    [{ type: "image", url: "example" }],
    [{ text: "hi" }],
    [{ type: "text" }],
    [{ type: "text", text: "hi", extra: true }],
    [{ callId: "1", name: "tool", arguments: {} }],
    [{ type: "tool_call", name: "tool", arguments: {} }],
    [{ type: "tool_call", callId: "1", arguments: {} }],
    [{ type: "tool_call", callId: "1", name: "tool" }],
    [{ type: "tool_call", callId: "", name: "tool", arguments: {} }],
    [{ callId: "1", result: null }],
    [{ type: "tool_result", callId: "1" }],
    [{ type: "tool_result", result: null }],
    [{ type: "tool_result", callId: "1", result: null, isError: "yes" }],
  ]) {
    assert.equal(matches(content, invalid), false, JSON.stringify(invalid));
  }
});

test("tool descriptor schema shape", () => {
  const schema = load("tool-descriptor.schema.json");
  assert(schema.required.includes("name"));
  assert(schema.required.includes("inputSchema"));
  assert.equal(schema.additionalProperties, false);
});

test("chat request schema references", () => {
  const schema = load("chat-request.schema.json");
  assert(schema.required.includes("model"));
  assert(schema.required.includes("messages"));
  const messages = schema.properties.messages;
  assert.equal(messages.items["$ref"], "message.schema.json");
});

test("chat stream event schema has five variants", () => {
  const schema = load("chat-stream-event.schema.json");
  assert.equal(Array.isArray(schema.oneOf), true);
  assert.deepEqual(schema.oneOf.map((variant) => variant.properties.type.const), [
    "token", "tool_call", "tool_result", "done", "error",
  ]);
});
