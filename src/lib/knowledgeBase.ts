import { readFile } from "node:fs/promises";
import path from "node:path";

export interface KnowledgeSnippet {
  title: string;
  reference: string;
  excerpt: string;
}

interface KnowledgeDoc {
  id?: string;
  title: string;
  summary: string;
  body: string;
  reference: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(query: string): string[] {
  const tokens = normalize(query)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
  return Array.from(new Set(tokens)).slice(0, 20);
}

function extractDocs(parsed: unknown): KnowledgeDoc[] {
  const root = parsed as { response?: { docs?: unknown[] } };
  const docs = root?.response?.docs;
  if (!Array.isArray(docs)) return [];

  return docs
    .map((doc) => {
      const item = doc as Record<string, unknown>;
      const title = String(item.eolShpTitle ?? item.title ?? "Documento sin titulo").trim();
      const summary = String(item.eolShpResumenPublico ?? item.eolShpResumen ?? "").trim();
      const body = String(item.eolShpBody ?? item.body ?? "").trim();
      const normId = String(item.eolShpNumeroNorma ?? item.id ?? "BDTest").trim();
      return {
        id: item.id ? String(item.id) : undefined,
        title,
        summary,
        body,
        reference: normId || "BDTest",
      };
    })
    .filter((d) => d.title.length > 0 && (d.summary.length > 0 || d.body.length > 0));
}

function parseKnowledgeText(fileText: string): KnowledgeDoc[] {
  const trimmed = fileText.trim();
  if (!trimmed) return [];

  const candidates = [trimmed, `{${trimmed}}`];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const docs = extractDocs(parsed);
      if (docs.length > 0) return docs;
    } catch {
      // Try next parsing strategy.
    }
  }

  return [
    {
      title: "BDTest.txt",
      summary: "",
      body: trimmed,
      reference: "BDTest",
    },
  ];
}

function scoreDoc(doc: KnowledgeDoc, tokens: string[]): number {
  const haystack = normalize([doc.title, doc.summary, stripHtml(doc.body)].join(" "));
  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    const exactMatches = haystack.split(token).length - 1;
    score += exactMatches * 2;
    if (normalize(doc.title).includes(token)) {
      score += 5;
    }
  }
  return score;
}

function buildExcerpt(doc: KnowledgeDoc, tokens: string[]): string {
  const plain = stripHtml([doc.summary, doc.body].filter(Boolean).join(" "));
  if (!plain) return "No se encontro texto util en el registro.";

  const normalizedPlain = normalize(plain);
  let start = 0;
  for (const token of tokens) {
    const idx = normalizedPlain.indexOf(token);
    if (idx >= 0) {
      start = Math.max(0, idx - 120);
      break;
    }
  }

  const excerpt = plain.slice(start, start + 520).trim();
  return excerpt.length < plain.length ? `${excerpt}...` : excerpt;
}

export async function getKnowledgeSnippets(
  query: string,
  maxSnippets = 3
): Promise<KnowledgeSnippet[]> {
  const knowledgePath =
    process.env.BD_FILE_PATH ?? path.join(process.cwd(), "src", "BBDD", "BDTest.txt");

  let fileText = "";
  try {
    fileText = await readFile(knowledgePath, "utf-8");
  } catch {
    return [];
  }

  const docs = parseKnowledgeText(fileText);
  if (docs.length === 0) return [];

  const tokens = tokenize(query);
  const ranked = docs
    .map((doc) => ({ doc, score: scoreDoc(doc, tokens) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(maxSnippets, 1));

  return ranked
    .map(({ doc }) => ({
      title: doc.title,
      reference: doc.reference,
      excerpt: buildExcerpt(doc, tokens),
    }))
    .filter((s) => s.excerpt.length > 0);
}

export function buildKnowledgeContext(snippets: KnowledgeSnippet[]): string {
  if (snippets.length === 0) return "";

  const lines = snippets.map(
    (snippet, index) =>
      `${index + 1}) ${snippet.title} [${snippet.reference}]\n${snippet.excerpt}`
  );

  return [
    "Contexto recuperado desde BDTest.txt (usar como fuente prioritaria):",
    ...lines,
  ].join("\n\n");
}
