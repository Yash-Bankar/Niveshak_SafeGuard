"use client";

import * as React from "react";

/**
 * Deliberately tiny, safe markdown subset for assistant replies:
 *   **bold**, "- " / "• " list items, paragraph breaks and plain line breaks.
 * Built as React nodes only — `dangerouslySetInnerHTML` is never used, so raw
 * model output can't inject markup.
 */

type Block =
  | { type: "p"; lines: string[] }
  | { type: "ul"; items: string[] };

function inline(text: string, key: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={`${key}-${i}`} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={`${key}-${i}`}>{part}</React.Fragment>
    )
  );
}

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const list = raw.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (list) {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "ul") last.items.push(list[1]);
      else blocks.push({ type: "ul", items: [list[1]] });
    } else if (raw.trim() === "") {
      continue;
    } else {
      const last = blocks[blocks.length - 1];
      if (last && last.type === "p") last.lines.push(raw);
      else blocks.push({ type: "p", lines: [raw] });
    }
  }
  return blocks;
}

export function SafeMarkdown({ text }: { text: string }) {
  const blocks = parse(text);

  return (
    <div className="space-y-1.5">
      {blocks.map((block, i) =>
        block.type === "p" ? (
          <p key={i}>
            {block.lines.map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 ? <br /> : null}
                {inline(line, `${i}-${j}`)}
              </React.Fragment>
            ))}
          </p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-4">
            {block.items.map((item, j) => (
              <li key={j}>{inline(item, `${i}-${j}`)}</li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
