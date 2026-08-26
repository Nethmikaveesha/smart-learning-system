import { Fragment, useMemo } from "react";

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
 * Normalize newlines and ensure pipe tables are easier to detect.
 * Display-only helper — does not change stored answer text.
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

function isSeparatorRow(cells) {
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(String(cell).trim()))
  );
}

function parseTableRow(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed.startsWith("|")) return null;

  const raw = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  return raw.split("|").map((cell) => cell.trim());
}

/**
 * Escape text, then apply a small safe subset of inline Markdown:
 * **bold**, *italic*, `code`. No HTML passthrough.
 */
function renderInline(text) {
  const source = String(text || "");
  if (!source) return null;

  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const parts = source.split(pattern);

  return parts.map((part, index) => {
    if (!part) return null;

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={index} className="font-semibold text-slate-950">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (
      part.startsWith("*") &&
      part.endsWith("*") &&
      part.length > 2 &&
      !part.startsWith("**")
    ) {
      return (
        <em key={index} className="italic text-slate-800">
          {part.slice(1, -1)}
        </em>
      );
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={index}
          className="rounded bg-slate-100 px-1.5 py-0.5 text-[0.85em] text-slate-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}

function MarkdownTable({ rows }) {
  if (!rows.length) return null;

  const [header, ...body] = rows;

  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <tr>
            {header.map((cell, index) => (
              <th
                key={`h-${index}`}
                className="border-b border-slate-200 px-3 py-2.5 font-semibold text-slate-700"
              >
                {renderInline(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {body.map((row, rowIndex) => (
            <tr key={`r-${rowIndex}`} className="align-top">
              {row.map((cell, cellIndex) => (
                <td
                  key={`c-${rowIndex}-${cellIndex}`}
                  className="px-3 py-2.5 text-slate-800"
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Lightweight, dependency-free Markdown subset renderer for essay answers.
 * Supports GFM-style tables, bold/italic/code, headings, and paragraphs.
 */
function MarkdownBlock({ content }) {
  const markdown = prepareAnswerMarkdown(content);
  if (!markdown) return null;

  const lines = markdown.split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^\s*\|/.test(line)) {
      const tableLines = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) {
        tableLines.push(lines[i]);
        i += 1;
      }

      const parsedRows = tableLines
        .map(parseTableRow)
        .filter((row) => row && !isSeparatorRow(row));

      if (parsedRows.length > 0) {
        blocks.push({ type: "table", rows: parsedRows });
      }
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        text: heading[2].trim(),
      });
      i += 1;
      continue;
    }

    const paragraph = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*\|/.test(lines[i]) &&
      !/^#{1,3}\s+/.test(lines[i].trim())
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }

    blocks.push({
      type: "paragraph",
      text: paragraph.join(" ").replace(/\s+/g, " ").trim(),
    });
  }

  return (
    <div className="markdown-answer space-y-1">
      {blocks.map((block, index) => {
        if (block.type === "table") {
          return <MarkdownTable key={`t-${index}`} rows={block.rows} />;
        }

        if (block.type === "heading") {
          const Tag = block.level >= 3 ? "h4" : "h3";
          return (
            <Tag
              key={`h-${index}`}
              className="mb-2 text-sm font-semibold text-slate-900"
            >
              {renderInline(block.text)}
            </Tag>
          );
        }

        return (
          <p
            key={`p-${index}`}
            className="mb-3 text-sm leading-7 text-slate-800 last:mb-0"
          >
            {renderInline(block.text)}
          </p>
        );
      })}
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
    return <p className="text-sm text-slate-500">No answer submitted.</p>;
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
