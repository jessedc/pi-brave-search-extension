# Brave Web Search Extension for Pi

A **unified web search tool** for Pi that uses the Brave Search CLI (`bx`).

## ✨ Features

- **Single tool** (`web_search`) with multiple search types
- **AI-grounded answers** with citations
- **News search** with freshness filters
- **Image & video search**
- **Content extraction** for RAG
- **Automatic truncation** (50KB / 2000 lines)
- **Custom TUI rendering**

## 📦 Installation

### Prerequisites

1. **Install Brave Search CLI** (`bx`):
   - Download: https://brave.com/search/api/

2. **Configure API key**:
   ```bash
   bx config set-key YOUR_API_KEY
   ```
   Or get your key from: https://api-dashboard.search.brave.com

### Install Extension

```bash
# Clone or download this repository
cd pi-brave-search-extension

# Run installer
./install.sh

# Or manually copy
cp brave-search.ts ~/.pi/agent/extensions/
```

### Verify Installation

```bash
pi
/reload

# Test with a search
"Find TypeScript documentation"
```

## 🎯 Usage

The LLM will see **one tool**: `web_search`

### Search Types

| Type | Use Case | Example |
|------|----------|---------|
| `web` (default) | General search | Documentation, resources |
| `answers` | Q&A with citations | "How does X work?" |
| `news` | Recent articles | "Latest AI news" |
| `images` | Visual assets | "Architecture diagrams" |
| `videos` | Video content | "Tutorial videos" |
| `context` | Content extraction | "Extract API docs" |

### Examples

**General Search:**
```
User: "Find the official React documentation"
LLM: web_search({ query: "React documentation", type: "web" })
```

**Q&A:**
```
User: "How does Rust's borrow checker work?"
LLM: web_search({ query: "Rust borrow checker explained", type: "answers" })
```

**News:**
```
User: "What's new in AI this week?"
LLM: web_search({ query: "AI developments", type: "news", freshness: "pw" })
```

**Content Extraction:**
```
User: "Extract the Express.js API documentation"
LLM: web_search({ query: "Express.js API", type: "context", max_tokens: 8000 })
```

**Media:**
```
User: "Find Kubernetes tutorial videos"
LLM: web_search({ query: "Kubernetes tutorial", type: "videos" })
```

### Parameters

```typescript
{
  query: string,           // Required: Search query
  type?: "web" | "answers" | "news" | "images" | "videos" | "context",
  count?: number,          // 1-20, default: 10
  freshness?: "pd"|"pw"|"pm"|"py",  // For news only
  max_tokens?: number      // 100-32000, for context only
}
```

**Freshness filters:**
- `pd` - Past day
- `pw` - Past week
- `pm` - Past month
- `py` - Past year

## 🔧 How It Works

### What the LLM Sees

**Tool name:** `web_search`

**Description:**
> Search the web using Brave Search. Use this tool to find information, documentation, news, images, videos, or get AI-grounded answers. Specify the search type: 'web' for general search (default), 'answers' for AI-grounded Q&A, 'news' for recent articles, 'images' for images, 'videos' for videos, 'context' for RAG content extraction.

**System Prompt Guidelines:**
```
- Use web_search when the user asks to search for information, find 
  documentation, look up recent news, or find media
- Specify type='answers' when the user asks a question that requires 
  a synthesized answer with citations
- Specify type='news' with freshness parameter when the user asks about 
  recent events or current topics
- Specify type='context' when you need to extract detailed content from 
  web pages for research or analysis
```

### Why Unified is Better

✅ **Clearer for LLMs** - One tool, not six choices  
✅ **Fewer mistakes** - Explicit type parameter  
✅ **Token efficient** - ~500 tokens saved in system prompt  
✅ **Better guidance** - Clear prompt guidelines  
✅ **Easier maintenance** - Single tool to update  

## 🎨 Features

### Output Truncation

All search results are automatically truncated to prevent LLM context overflow:
- **Limit:** 50KB (~10k tokens) or 2000 lines
- **Full output:** Saved to temp file when truncated
- **LLM notification:** Model is informed with file path

### Custom TUI Rendering

- **Compact view:** Shows result count and type emoji
- **Expanded view:** Shows actual results (press Enter to expand)
- **Progress indicators:** "Searching...", "Extracting content...", etc.
- **Truncation warnings:** Visual indicator when output is truncated

### Error Handling

- ✅ API key validation
- ✅ bx CLI availability check
- ✅ Rate limit detection
- ✅ Helpful error messages

## 🧪 Testing

```bash
# Check bx CLI
which bx
bx config show-key

# Test search directly
bx "TypeScript documentation" --count 5

# Test in Pi
pi
"Find documentation about async/await"
```

## 🆘 Troubleshooting

### "bx: command not found"

Install the Brave Search CLI:
- Download from: https://brave.com/search/api/

### "API key not configured"

```bash
bx config set-key YOUR_API_KEY
```

### Tool not appearing in Pi

```bash
# Check extension is installed
ls ~/.pi/agent/extensions/brave-search.ts

# Reload extensions
pi /reload

# Restart Pi
pi
```

### Poor search results

- Be more specific in your query
- Try a different `type` parameter
- Increase `count` for more results
- Check API key has sufficient quota

## 📊 Token Efficiency

| Approach | System Prompt Tokens |
|----------|---------------------|
| 6 separate tools | ~700 tokens |
| **Unified tool** | **~250 tokens** |

**Savings:** ~450 tokens per conversation!

## 🚀 Advanced Usage

### Pagination

For large result sets, use offset (not directly exposed, but LLM can make multiple calls):

```
First page: web_search({ query: "...", count: 20 })
Second page: web_search({ query: "...", count: 20 }) // LLM refines query
```

### Content Extraction Rules

The `context` type supports CSS selectors for targeted extraction (via bx `--extract-rules`):

```
web_search({ 
  query: "React hooks documentation",
  type: "context",
  // Note: extract_rules not yet exposed in schema, coming soon
})
```

### Combining Search Types

For comprehensive research, the LLM can make multiple calls:

```
1. web_search({ query: "...", type: "news", freshness: "pw" })
2. web_search({ query: "...", type: "answers" })
3. web_search({ query: "...", type: "context", max_tokens: 8000 })
```

## 📁 Project Structure

```
pi-brave-search-extension/
├── brave-search.ts        # Main extension (unified tool)
├── package.json           # Package metadata
├── install.sh            # Installation script
├── README.md             # This file
└── .gitignore
```

## 🔗 Resources

- [Brave Search API](https://brave.com/search/api/)
- [Brave CLI GitHub](https://github.com/brave/brave-search-cli)
- [Pi Extension Docs](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/docs/extensions.md)
- [API Dashboard](https://api-dashboard.search.brave.com)

## 📝 License

MIT License

---

**One tool. Every search need. 🔍**
