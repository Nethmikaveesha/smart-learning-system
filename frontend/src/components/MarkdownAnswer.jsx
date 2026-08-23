import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

const SECTION_PATTERNS = [
  {
    id: "journal",
    title: "Journal Entries",
    match: /^(#{1,3}\s*)?journal\s*entr(y|ies)\b/i,
  },
  {
    id: "balances",
    title: "Final Balances",
    match: /^(#{1,3}\s*)?(final\s+balances?|trial\s+balance|balance\s+sheet)\b/i,
  },
  {
    id: "equation",
    title: "Accounting Equation",
    match: /^(#{1,3}\s*)?accounting\s+equation\b/i,
  },
];

/**
 * Make GFM tables more reliable: blank line before a pipe table,
 * and normalize Windows newlines.
 */
export function prepareAnswerMarkdown(raw) {
  const text = String(raw || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  if (!text) return "";

  const lines = text.split("\n");
  const out = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const prev = out[out.length - 1];
    const isTableRow = /^\s*\|/.test(line);
    const prevIsTableRow = prev != null && /^\s*\|/.test(prev);
    const prevBlank = prev == null || prev.trim() === "";

    if (isTableRow && !prevIsTableRow && !prevBlank && out.length > 0) {
      out.push("");
    }

    out.push(line);
  }

  return out.join("\n");
}

function isSectionHeader(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return null;

  for (const pattern of SECTION_PATTERNS) {
    if (pattern.match.test(trimmed)) {
      return pattern;
    }
  }

  return null;
}

/**
 * Split an answer into titled sections when clear headers exist.
 * If there are no headers but multiple markdown tables, label the
 * common accounting blocks for clearer reading (display only).
 */
export function splitAnswerSections(raw) {
  const prepared = prepareAnswerMarkdown(raw);
  if (!prepared) return [];

  const lines = prepared.split("\n");
  const sections = [];
  let current = null;
  let foundNamedHeader = false;

  const startSection = (title) => {
    current = { title, lines: [] };
    sections.push(current);
  };

  for (const line of lines) {
    const header = isSectionHeader(line);
    if (header) {
      foundNamedHeader = true;
      startSection(header.title);
      continue;
    }

    if (!current) {
      startSection("Student Answer");
    }

    current.lines.push(line);
  }

  const named = sections
    .map((section) => ({
      title: section.title,
      content: section.lines.join("\n").trim(),
    }))
    .filter((section) => section.content.length > 0);

  if (foundNamedHeader) {
    return named;
  }

  return splitUntitledAccountingBlocks(prepared) || named;
}

function extractTableBlocks(text) {
  const lines = String(text || "").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    if (!/^\s*\|/.test(lines[i])) {
      i += 1;
      continue;
    }

    const start = i;
    while (i < lines.length && /^\s*\|/.test(lines[i])) {
      i += 1;
    }
    blocks.push({
      start,
      end: i,
      content: lines.slice(start, i).join("\n").trim(),
    });
  }

  return { lines, blocks };
}

function splitUntitledAccountingBlocks(prepared) {
  const { lines, blocks } = extractTableBlocks(prepared);
  if (blocks.length < 2) return null;

  const before = lines.slice(0, blocks[0].start).join("\n").trim();
  const between = lines
    .slice(blocks[0].end, blocks[1].start)
    .join("\n")
    .trim();
  const after = lines.slice(blocks[blocks.length - 1].end).join("\n").trim();

  const sections = [];

  if (before) {
    sections.push({ title: "Introduction", content: before });
  }

  sections.push({
    title: "Journal Entries",
    content: blocks[0].content,
  });

  if (between) {
    sections.push({ title: "Notes", content: between });
  }

  if (blocks.length === 2) {
    sections.push({
      title: "Final Balances",
      content: blocks[1].content,
    });
  } else {
    sections.push({
      title: "Final Balances",
      content: blocks
        .slice(1)
        .map((block) => block.content)
        .join("\n\n"),
    });
  }

  if (after) {
    const equationLike =
      /assets|liabilit|equity|owner'?s?\s+equity|accounting\s+equation/i.test(
        after
      );
    sections.push({
      title: equationLike ? "Accounting Equation" : "Additional Notes",
      content: after,
    });
  }

  return sections;
}

const markdownComponents = {
  h1: ({ children }) => (
    <h3 className="mb-3 text-base font-semibold text-slate-900">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-3 text-base font-semibold text-slate-900">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-2 text-sm font-semibold text-slate-900">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="mb-3 text-sm leading-7 text-slate-800 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-950">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-slate-800">{children}</em>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-slate-800">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-slate-800">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-4 border-slate-300 pl-3 text-sm text-slate-700">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (!isBlock) {
      return (
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.85em] text-slate-800">
          {children}
        </code>
      );
    }

    return (
      <code
        className={`block overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100 ${className || ""}`}
      >
        {children}
      </code>
    );
  },
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
  ),
  tr: ({ children }) => <tr className="align-top">{children}</tr>,
  th: ({ children }) => (
    <th className="border-b border-slate-200 px-3 py-2.5 font-semibold text-slate-700">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2.5 text-slate-800">{children}</td>
  ),
  hr: () => <hr className="my-4 border-slate-200" />,
};

function MarkdownBlock({ content }) {
  const markdown = prepareAnswerMarkdown(content);
  if (!markdown) return null;

  return (
    <div className="markdown-answer">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={markdownComponents}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Display-only renderer for student essay answers.
 * Does not mutate stored answer text — formats for reading only.
 */
export default function MarkdownAnswer({ answer, className = "" }) {
  const sections = useMemo(() => splitAnswerSections(answer), [answer]);

  if (!sections.length) {
    return (
      <p className="text-sm text-slate-500">No answer submitted.</p>
    );
  }

  const useCards =
    sections.length > 1 ||
    (sections.length === 1 && sections[0].title !== "Student Answer");

  if (!useCards) {
    return (
      <div className={className}>
        <MarkdownBlock content={sections[0].content} />
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {sections.map((section) => (
        <section
          key={`${section.title}-${section.content.slice(0, 24)}`}
          className="rounded-lg border border-slate-200 bg-white p-4"
        >
          <h3 className="text-sm font-semibold text-slate-900">
            {section.title}
          </h3>
          <div className="mt-3">
            <MarkdownBlock content={section.content} />
          </div>
        </section>
      ))}
    </div>
  );
}
