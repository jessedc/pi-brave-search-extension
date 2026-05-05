# Brave Web Search Extension for Pi

A Pi coding-agent extension that exposes a single unified `web_search` tool to the LLM, backed by the [Brave Search CLI](https://brave.com/search/api/) (`bx`).

One tool with a `type` parameter (`web` / `answers` / `news` / `images` / `videos` / `context`) instead of six separate tools — fewer choices for the model, less system-prompt overhead.

## ✨ Features

- **Single tool** (`web_search`) with multiple search types
- **AI-grounded answers** with citations
- **News search** with freshness filters
- **Image & video search**
- **Content extraction** for RAG
- **Automatic truncation** (50 KB / 2000 lines, full output saved to a temp file)

## 📦 Installation

### 1. Install and configure the Brave Search CLI

The extension shells out to `bx`, so it must be on `PATH` and authenticated before Pi loads the extension.

```bash
# Install bx — see https://brave.com/search/api/ for current options
# Then set your API key (get one at https://api-dashboard.search.brave.com)
bx config set-key YOUR_API_KEY
```

Verify:

```bash
which bx
bx config show-key
bx "test query" --count 1
```

### 2. Install the extension

The extension is a single TypeScript file that Pi loads directly — **no build step and no `npm install` required**. Dependencies (`@mariozechner/pi-coding-agent`, `pi-ai`, `pi-tui`, `typebox`) are resolved from Pi's own runtime.

```bash
# Clone the repo (or download the zip from GitHub and extract it)
git clone <repository-url> pi-brave-search-extension
cd pi-brave-search-extension

# Run the installer — copies brave-search.ts into ~/.pi/agent/extensions/
# and backs up any existing copy with a timestamped suffix
./install.sh
```

If you'd rather copy the file by hand:

```bash
mkdir -p ~/.pi/agent/extensions
cp brave-search.ts ~/.pi/agent/extensions/
```

### 3. Reload Pi

```bash
pi
/reload

# Then try a search
"Find TypeScript documentation"
```

## 🎯 Usage

The LLM sees one tool: `web_search`.

### Search Types

| Type | Use Case | Example |
|------|----------|---------|
| `web` (default) | General search | Documentation, resources |
| `answers` | Q&A with citations | "How does X work?" |
| `news` | Recent articles | "Latest AI news" |
| `images` | Visual assets | "Architecture diagrams" |
| `videos` | Video content | "Tutorial videos" |
| `context` | Content extraction | "Extract API docs" |

### Parameters

```typescript
{
  query: string,           // Required: search query
  type?: "web" | "answers" | "news" | "images" | "videos" | "context",
  count?: number,          // 1–20, default: 10
  freshness?: "pd"|"pw"|"pm"|"py",  // type=news only
  max_tokens?: number      // 100–32000, type=context only
}
```

`freshness` is only valid with `type="news"`, and `max_tokens` is only valid with `type="context"`. Mismatches raise an error before `bx` is invoked.

**Freshness filters:** `pd` past day · `pw` past week · `pm` past month · `py` past year

### Examples

**General search:**
```
User: "Find the official React documentation"
LLM:  web_search({ query: "React documentation" })
```

**Q&A with citations:**
```
User: "How does Rust's borrow checker work?"
LLM:  web_search({ query: "Rust borrow checker explained", type: "answers" })
```

**Recent news:**
```
User: "What's new in AI this week?"
LLM:  web_search({ query: "AI developments", type: "news", freshness: "pw" })
```

**Content extraction for RAG:**
```
User: "Extract the Express.js API documentation"
LLM:  web_search({ query: "Express.js API", type: "context", max_tokens: 8000 })
```

**Media:**
```
User: "Find Kubernetes tutorial videos"
LLM:  web_search({ query: "Kubernetes tutorial", type: "videos" })
```

## 🔧 How it works

`brave-search.ts` registers a single `web_search` tool with Pi via the extension API. On invocation it builds a `bx <type> <query> --count <n> [--freshness …] [--max-tokens …]` command, runs it via `execFileSync`, and returns the output.

Output is truncated to **2000 lines / 50 KB** (whichever hits first) using `pi-coding-agent`'s shared truncation utilities. When truncation occurs, the full output is written to a temp file and the path is appended to the result so the model can re-read it if needed.

A `tool_call` hook blocks calls when `bx` is not on `PATH` and surfaces an actionable error to the model.

## 🧪 Testing

```bash
# Sanity-check bx itself
which bx
bx config show-key
bx "TypeScript documentation" --count 5

# Test inside Pi
pi
"Find documentation about async/await"
```

## 🆘 Troubleshooting

### `bx: command not found`

Install the Brave Search CLI from <https://brave.com/search/api/> and make sure it's on your `PATH`. The extension caches the result of the `bx` lookup once per process, so restart Pi after installing.

### `Brave Search API key not configured`

```bash
bx config set-key YOUR_API_KEY
```

### Tool not appearing in Pi

```bash
# Confirm the extension is in place
ls ~/.pi/agent/extensions/brave-search.ts

# Reload extensions, then restart Pi if that's not enough
pi
/reload
```

### Rate limits

The extension surfaces Brave's rate-limit errors verbatim. If you're hitting them, slow down or check your plan at <https://api-dashboard.search.brave.com>.

### Poor search results

- Be more specific in your query
- Try a different `type`
- Increase `count` for more results
- For `context`, raise `max_tokens` if the extracted page is being cut short

## 🔗 Resources

- [Brave Search API](https://brave.com/search/api/)
- [Brave CLI on GitHub](https://github.com/brave/brave-search-cli)
- [Pi extension docs](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/docs/extensions.md)
- [Brave API dashboard](https://api-dashboard.search.brave.com)

## 📝 License

MIT
