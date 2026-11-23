import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tscBin = join(
  __dirname,
  "..",
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc"
);

test("types compile and ChatStreamEvent is exhaustive", () => {
  const dir = mkdtempSync(join(__dirname, "tmp-"));
  const entry = join(dir, "sample.ts");
  const typesImport = "../../src/types.js";
  writeFileSync(
    entry,
    `
      import type { ChatStreamEvent, ContentPart, Message, ProtocolError, ToolDescriptor } from "${typesImport}";

      const msg: Message = {
        id: "1", role: "assistant", timestamp: new Date().toISOString(),
        content: [
          { type: "text", text: "hi" },
          { type: "tool_call", name: "fs.readFile", arguments: { path: "a" }, callId: "call-1" },
          { type: "tool_result", callId: "call-1", result: null, isError: true },
          { type: "text", text: "done" },
        ],
      };
      const tool: ToolDescriptor = { name: "fs.readFile", inputSchema: { type: "object" } };
      const err: ProtocolError = { message: "bad", code: "bad_request" };
      void msg; void tool; void err;

      function partText(part: ContentPart): string {
        switch (part.type) {
          case "text": return part.text;
          case "tool_call": return part.callId + part.name;
          case "tool_result": return part.callId;
          default: {
            const _exhaustive: never = part;
            return _exhaustive;
          }
        }
      }
      void partText;

      // @ts-expect-error legacy string content is not supported
      const legacyContent: Message = { id: "1", role: "user", content: "hi", timestamp: "" };
      // @ts-expect-error legacy singular tool calls are not supported
      const legacyToolCall: Message = { id: "1", role: "assistant", content: [], timestamp: "", toolCall: {} };
      // @ts-expect-error unknown part kinds are not supported
      const unknownPart: ContentPart = { type: "image", url: "example" };
      // @ts-expect-error tool results require a call ID
      const uncorrelated: ContentPart = { type: "tool_result", result: null };
      void legacyContent; void legacyToolCall; void unknownPart; void uncorrelated;

      function handle(evt: ChatStreamEvent): string {
        switch (evt.type) {
          case "token": return evt.data;
          case "tool_call": return evt.data.name;
          case "tool_result": return evt.data.callId;
          case "done": return "done";
          case "error": return evt.data.message;
          default: {
            const _exhaustive: never = evt;
            return _exhaustive;
          }
        }
      }

      handle({ type: "token", data: "hi" });
      handle({ type: "tool_call", data: { name: "fs.readFile", arguments: {}, callId: "call-1" } });
      handle({ type: "tool_result", data: { callId: "call-1", result: null } });
      handle({ type: "done", data: { usage: {} } });
      handle({ type: "error", data: { message: "failed" } });
    `,
    "utf8"
  );

  try {
    execFileSync(tscBin, ["--noEmit", "--pretty", "false", "--strict", entry], {
      stdio: "inherit",
      cwd: dir,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
