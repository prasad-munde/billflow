"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

export function MarkdownRenderer({ content, className = "", isUser = false }: MarkdownRendererProps) {
  if (isUser) {
    return <div className={`whitespace-pre-wrap ${className}`}>{content}</div>;
  }

  // Parse lines into structured blocks
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  const flushList = (keyPrefix: number) => {
    if (!currentList) return;
    if (currentList.type === "ul") {
      blocks.push(
        <ul key={`ul-${keyPrefix}`} className="my-2.5 space-y-1.5 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-ink/85 leading-relaxed">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cobalt" />
              <span className="flex-1">{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
    } else {
      blocks.push(
        <ol key={`ol-${keyPrefix}`} className="my-2.5 space-y-1.5 pl-1">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-ink/85 leading-relaxed">
              <span className="shrink-0 font-mono text-xs font-bold text-cobalt">{idx + 1}.</span>
              <span className="flex-1">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code block toggle
    if (trimmed.startsWith("```")) {
      flushList(i);
      if (inCodeBlock) {
        blocks.push(
          <pre key={`code-${i}`} className="my-3 overflow-x-auto rounded-xl bg-ink p-3.5 font-mono text-xs text-white">
            <code>{codeBlockContent.join("\n")}</code>
          </pre>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(rawLine);
      continue;
    }

    // Empty lines
    if (!trimmed) {
      flushList(i);
      continue;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      flushList(i);
      const text = trimmed.replace(/^###\s+/, "");
      blocks.push(
        <h3 key={`h3-${i}`} className="font-display text-base md:text-lg font-bold text-ink mt-4 mb-1.5 flex items-center gap-2">
          {renderInline(text)}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList(i);
      const text = trimmed.replace(/^##\s+/, "");
      blocks.push(
        <h2 key={`h2-${i}`} className="font-display text-lg md:text-xl font-bold text-ink mt-5 mb-2 border-b border-ink/10 pb-1">
          {renderInline(text)}
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushList(i);
      const text = trimmed.replace(/^#\s+/, "");
      blocks.push(
        <h1 key={`h1-${i}`} className="font-display text-xl md:text-2xl font-bold text-ink mt-6 mb-2">
          {renderInline(text)}
        </h1>
      );
      continue;
    }

    // Unordered lists (•, -, *)
    if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const itemText = trimmed.replace(/^[•\-\*]\s+/, "");
      if (!currentList || currentList.type !== "ul") {
        flushList(i);
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(itemText);
      continue;
    }

    // Ordered lists (1., 2., etc)
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      const itemText = orderedMatch[2];
      if (!currentList || currentList.type !== "ol") {
        flushList(i);
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(itemText);
      continue;
    }

    // Horizontal Rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      flushList(i);
      blocks.push(<hr key={`hr-${i}`} className="my-4 border-t border-ink/10" />);
      continue;
    }

    // Regular Paragraph
    flushList(i);
    blocks.push(
      <p key={`p-${i}`} className="my-1.5 leading-relaxed text-ink/90">
        {renderInline(trimmed)}
      </p>
    );
  }

  flushList(lines.length);

  return <div className={`space-y-1 text-sm md:text-base leading-relaxed ${className}`}>{blocks}</div>;
}

/**
 * Parses inline formatting: **bold**, `code`, and links.
 */
function renderInline(text: string): React.ReactNode {
  // Regex to match **bold** or `code` or [link](url)
  const regex = /(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g;
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    if (!part) return null;

    // Bold: **text**
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} className="font-bold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Inline code: `text`
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={idx}
          className="rounded bg-paper px-1.5 py-0.5 font-mono text-[11px] md:text-xs font-semibold text-cobalt border border-ink/10"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Link: [text](url)
    const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={idx}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-cobalt font-semibold underline hover:text-ink transition"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return part;
  });
}
