"use client";

/**
 * Renders text with the currently-spoken word highlighted. Word counting
 * matches `splitWords` (non-whitespace tokens), so the index from the speech
 * store lines up. Whitespace is preserved.
 */
export function HighlightedText({
  text,
  activeWord,
  className,
}: {
  text: string;
  /** Global word index to highlight, or -1 for none. */
  activeWord: number;
  className?: string;
}) {
  const tokens = text.split(/(\s+)/);
  const isWord = tokens.map((token) => token.length > 0 && !/^\s+$/.test(token));
  // Word index per token, computed without a mutable render-time counter.
  const wordIndex = isWord.map((word, index) =>
    word ? isWord.slice(0, index).filter(Boolean).length : -1
  );

  return (
    <span className={className}>
      {tokens.map((token, index) => {
        const word = wordIndex[index];
        if (word === -1) return token;
        if (word === activeWord) {
          return (
            <mark
              key={index}
              className="rounded bg-blue-500/35 px-0.5 text-white"
            >
              {token}
            </mark>
          );
        }
        return <span key={index}>{token}</span>;
      })}
    </span>
  );
}
