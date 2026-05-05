/**
 * Brave Web Search Extension for Pi
 * 
 * Presents as a single, unified web search tool to LLMs.
 * Uses the Brave Search CLI (bx) for all search operations.
 * 
 * Requires Brave Search API key:
 *   bx config set-key <YOUR_KEY>
 *   Or BRAVE_SEARCH_API_KEY environment variable
 */

import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Type } from "typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { defineTool, type ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
	truncateHead,
	truncateTail,
	type TruncationResult,
	withFileMutationQueue,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";

// ============================================================================
// Parameter Schema - Single unified web search tool
// ============================================================================

const WebSearchParams = Type.Object({
	query: Type.String({ 
		description: "Search query - be specific and descriptive for best results" 
	}),
	type: StringEnum(
		["web", "answers", "news", "images", "videos", "context"] as const,
		{ 
			description: "Search type: 'web' for general search (default), 'answers' for AI-grounded Q&A, 'news' for recent articles, 'images' for images, 'videos' for videos, 'context' for RAG content extraction",
			default: "web"
		}
	),
	count: Type.Optional(Type.Integer({ 
		description: "Number of results (1-20, default: 10)", 
		minimum: 1, 
		maximum: 20 
	})),
	freshness: Type.Optional(StringEnum(["pd", "pw", "pm", "py"] as const, {
		description: "Time filter for news: pd=past day, pw=past week, pm=past month, py=past year (only used with type=news)",
	})),
	max_tokens: Type.Optional(Type.Integer({ 
		description: "Max tokens for content extraction (100-32000, default: 4000, only used with type=context)", 
		minimum: 100, 
		maximum: 32000 
	})),
});

// ============================================================================
// Types
// ============================================================================

interface WebSearchDetails {
	query: string;
	searchType: string;
	resultCount: number;
	truncation?: TruncationResult;
	fullOutputPath?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function executeBxCommand(args: string[], cwd: string): string {
	try {
		return execFileSync("bx", args, {
			cwd,
			encoding: "utf-8",
			maxBuffer: 100 * 1024 * 1024,
			stdio: ["ignore", "pipe", "pipe"],
		});
	} catch (err: any) {
		if (err.status !== undefined) {
			const stderr = err.stderr?.toString() || err.message;
			
			if (stderr.includes("API key") || stderr.includes("authentication")) {
				throw new Error(`Brave Search API key not configured. Run: bx config set-key <YOUR_KEY>`);
			}
			if (stderr.includes("rate limit")) {
				throw new Error("Brave Search API rate limit exceeded. Please wait and try again.");
			}
			if (err.status === 1 && !stderr.trim()) {
				return "";
			}
			throw new Error(`Brave Search failed: ${stderr}`);
		}
		throw err;
	}
}

async function processOutput(
	output: string,
	query: string,
	searchType: string,
	truncateMode: "head" | "tail" = "head"
): Promise<{ content: string; details: WebSearchDetails }> {
	const details: WebSearchDetails = {
		query,
		searchType,
		resultCount: 0,
	};

	if (!output.trim()) {
		return {
			content: "No results found",
			details,
		};
	}

	const lines = output.split("\n").filter((line) => line.trim());
	details.resultCount = lines.length;

	const truncation = truncateMode === "head"
		? truncateHead(output, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES })
		: truncateTail(output, { maxLines: DEFAULT_MAX_LINES, maxBytes: DEFAULT_MAX_BYTES });

	let resultText = truncation.content;

	if (truncation.truncated) {
		const tempDir = await mkdtemp(join(tmpdir(), "pi-brave-"));
		const tempFile = join(tempDir, "output.json");
		await withFileMutationQueue(tempFile, async () => {
			await writeFile(tempFile, output, "utf8");
		});

		details.truncation = truncation;
		details.fullOutputPath = tempFile;

		const truncatedLines = truncation.totalLines - truncation.outputLines;
		const truncatedBytes = truncation.totalBytes - truncation.outputBytes;

		resultText += `\n\n[Output truncated: showing ${truncation.outputLines} of ${truncation.totalLines} lines`;
		resultText += ` (${formatSize(truncation.outputBytes)} of ${formatSize(truncation.totalBytes)}).`;
		resultText += ` ${truncatedLines} lines (${formatSize(truncatedBytes)}) omitted.`;
		resultText += ` Full output saved to: ${tempFile}]`;
	}

	return { content: resultText, details };
}

// ============================================================================
// Single Unified Web Search Tool
// ============================================================================

const webSearchTool = defineTool({
	name: "web_search",
	label: "Web Search",
	description:
		"Search the web via Brave Search. The 'type' parameter selects the search mode: 'web' (default) general results, 'answers' AI-synthesized Q&A with citations, 'news' recent articles (supports 'freshness'), 'images', 'videos', 'context' RAG content extraction (supports 'max_tokens').",
	promptSnippet: "Brave web search (web | answers | news | images | videos | context)",
	promptGuidelines: [
		"Use web_search with type='answers' when the user asks a question that wants a synthesized answer with citations",
		"Use web_search with type='news' and a freshness filter (pd/pw/pm/py) when the user asks about recent or current events",
		"Use web_search with type='context' to extract detailed page content for research or analysis",
	],
	parameters: WebSearchParams,

	async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
		const { 
			query, 
			type = "web", 
			count = 10, 
			freshness,
			max_tokens 
		} = params;

		// Build bx command based on search type
		const args: string[] = [type, query, "--count", count.toString()];
		
		if (type === "news" && freshness) {
			args.push("--freshness", freshness);
		}
		
		if (type === "context" && max_tokens) {
			args.push("--max-tokens", max_tokens.toString());
		}

		const output = executeBxCommand(args, ctx.cwd);
		const result = await processOutput(output, query, type);

		return {
			content: [{ type: "text", text: result.content }],
			details: result.details,
		};
	},

	renderCall(args, theme) {
		const typeLabel = args.type !== "web" ? ` (${args.type})` : "";
		let text = theme.fg("toolTitle", theme.bold(`web_search${typeLabel} `));
		text += theme.fg("accent", `"${args.query}"`);
		
		if (args.freshness) {
			text += theme.fg("dim", ` [${args.freshness}]`);
		}
		if (args.count && args.count !== 10) {
			text += theme.fg("dim", ` (${args.count} results)`);
		}
		
		return new Text(text, 0, 0);
	},

	renderResult(result, { expanded, isPartial }, theme) {
		const details = result.details as WebSearchDetails | undefined;

		if (isPartial) {
			return new Text(theme.fg("warning", "Searching..."), 0, 0);
		}

		if (!details || details.resultCount === 0) {
			return new Text(theme.fg("dim", "No results found"), 0, 0);
		}

		const typeEmoji: Record<string, string> = {
			web: "🔍",
			answers: "💡",
			news: "📰",
			images: "🖼️",
			videos: "🎥",
			context: "📄",
		};
		const emoji = typeEmoji[details.searchType] || "🔍";

		let text = theme.fg("success", `${emoji} ${details.resultCount} results`);

		if (details.truncation?.truncated) {
			text += theme.fg("warning", " (truncated)");
		}

		if (expanded) {
			const content = result.content[0];
			if (content?.type === "text") {
				const lines = content.text.split("\n").slice(0, 15);
				for (const line of lines) {
					text += `\n${theme.fg("dim", line)}`;
				}
				if (content.text.split("\n").length > 15) {
					text += `\n${theme.fg("muted", "...")}`;
				}
			}
			if (details.fullOutputPath) {
				text += `\n${theme.fg("dim", `Full output: ${details.fullOutputPath}`)}`;
			}
		}

		return new Text(text, 0, 0);
	},
});

// ============================================================================
// Extension Entry Point
// ============================================================================

let bxAvailable: boolean | undefined;

function isBxAvailable(): boolean {
	if (bxAvailable === undefined) {
		try {
			execFileSync("which", ["bx"], { stdio: "ignore" });
			bxAvailable = true;
		} catch {
			bxAvailable = false;
		}
	}
	return bxAvailable;
}

export default function (pi: ExtensionAPI) {
	pi.registerTool(webSearchTool);

	pi.on("session_start", async (_event, ctx) => {
		if (isBxAvailable()) {
			ctx.ui.setStatus("web-search", "Web search ready");
		} else {
			ctx.ui.setStatus("web-search", "bx CLI not found");
			ctx.ui.notify(
				"Brave Search CLI (bx) not found. Install from: https://brave.com/search/api/",
				"warning"
			);
		}
	});

	pi.on("tool_call", async (event) => {
		if (event.toolName === "web_search" && !isBxAvailable()) {
			return {
				block: true,
				reason: "Brave Search CLI (bx) not found. Install from https://brave.com/search/api/",
			};
		}
	});
}
