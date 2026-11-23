## @tinlynk/protocol

Canonical types and JSON Schemas for the TinLynk ecosystem (agents, messages, and tools).

This package is the single source of truth for runtime wire contracts shared by:
- @tinlynk/sdk
- TinLynk Connect daemon
- TinLynk Chat applications

### Features

- Strongly typed TypeScript interfaces (messages, tool descriptors, streaming events, errors).
- JSON Schemas for validation and integration: messages, chat requests, stream events, tool descriptors.
- Stable semantic versioning with explicit protocol version export (`PROTOCOL_VERSION`).
- Zero runtime dependencies (TypeScript types only at build time).

### Installation

This package is not published yet. In this repository, use the local package/workspace dependency; install from npm after its first release.

### Usage (Types)

```ts
import { Message, ToolDescriptor, PROTOCOL_VERSION } from '@tinlynk/protocol';

const msg: Message = {
	id: 'm1',
	role: 'user',
	content: [{ type: 'text', text: 'Hello' }],
	timestamp: new Date().toISOString()
};

console.log('Protocol version:', PROTOCOL_VERSION);

const readFileTool: ToolDescriptor = {
	name: 'fs.readFile',
	description: 'Read UTF-8 text from a file',
	inputSchema: {
		type: 'object',
		required: ['path'],
		properties: { path: { type: 'string', minLength: 1 } },
		additionalProperties: false
	},
	outputSchema: {
		type: 'object',
		required: ['content'],
		properties: { content: { type: 'string' } },
		additionalProperties: false
	}
};
```

### Usage (Schema Validation Example)

You can pair the shipped JSON Schema with any compliant validator (e.g. Ajv):

```ts
import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
const ajv = new Ajv();
const schema = JSON.parse(readFileSync('node_modules/@tinlynk/protocol/schemas/message.schema.json','utf8'));
const validate = ajv.compile(schema);
const ok = validate({ id:'1', role:'user', content:[{ type:'text', text:'Hi' }], timestamp: new Date().toISOString() });
if(!ok) console.error(validate.errors);
```

### Metadata

`ChatRequest.metadata` and `Message.metadata` contain app-local annotations. Connect does not forward these fields to upstream providers or log them by default. Metadata is not a provider continuation-state mechanism.

### Versioning & Compatibility

- Follows SemVer.
- Breaking wire contract changes increment MAJOR.
- The SDK declares a compatible range; applications upgrade via SDK first.
- `PROTOCOL_VERSION` matches the package version; this package has not been published yet.

### Directory Layout

```
src/             TypeScript source (types + version)
schemas/         JSON Schemas (machine validation)
dist/            Compiled ESM output (after build)
```

### Build and Test
```bash
npm run build
npm test
```

Emits ESM artifacts to `dist/` (ES2022 + type declarations). Tests validate schema shapes and ensure the exported types compile.

### Design Principles

- Minimal surface area; keep protocol stable and small.
- No runtime logic or external network calls.
- Content is an ordered list of explicitly supported `text`, `tool_call`, and `tool_result` parts. Unknown part types are rejected.

### Contributing

1. Propose schema/type changes in a PR with rationale.
2. Increment version following SemVer rules.
3. Update any impacted JSON Schemas.
4. Add brief CHANGELOG entry (future addition) and ensure dependent packages still build.

### Future Enhancements

- Additional schemas for tool execution events.
- Generated JSON Schema index manifest.
- Protocol conformance test suite (golden samples).

### License

MIT
