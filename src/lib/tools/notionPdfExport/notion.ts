const NOTION_API_BASE_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

interface NotionRichText {
  plain_text: string;
  href: string | null;
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
}

interface NotionBlockData {
  rich_text?: NotionRichText[];
  checked?: boolean;
  language?: string;
  title?: string;
  expression?: string;
  url?: string;
  file?: {
    url?: string;
  };
  external?: {
    url?: string;
  };
}

interface NotionBlock {
  id: string;
  type: string;
  has_children: boolean;
  [key: string]: unknown;
}

interface NotionBlockWithChildren extends NotionBlock {
  children?: NotionBlockWithChildren[];
}

interface NotionListResponse {
  results: NotionBlock[];
  has_more: boolean;
  next_cursor: string | null;
}

interface NotionPageProperty {
  type: string;
  title?: NotionRichText[];
}

interface NotionPageResponse {
  id: string;
  properties: Record<string, NotionPageProperty>;
}

function toNotionId(raw: string): string {
  return raw.replaceAll("-", "");
}

function formatNotionId(raw: string): string {
  const normalized = toNotionId(raw);
  if (normalized.length !== 32) {
    return raw;
  }

  return [
    normalized.slice(0, 8),
    normalized.slice(8, 12),
    normalized.slice(12, 16),
    normalized.slice(16, 20),
    normalized.slice(20),
  ].join("-");
}

export function extractPageId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const uuidPattern =
    /([0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  const directMatch = trimmed.match(uuidPattern);
  if (directMatch) {
    return formatNotionId(directMatch[1]);
  }

  try {
    const url = new URL(trimmed);
    const decodedPath = decodeURIComponent(url.pathname);
    const pathMatch = decodedPath.match(uuidPattern);
    return pathMatch ? formatNotionId(pathMatch[1]) : null;
  } catch {
    return null;
  }
}

async function notionRequest<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${NOTION_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Notion API error ${response.status}: ${body || response.statusText}`);
  }

  return (await response.json()) as T;
}

async function fetchAllChildren(
  blockId: string,
  token: string,
): Promise<NotionBlockWithChildren[]> {
  const allBlocks: NotionBlock[] = [];
  let nextCursor: string | null = null;

  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (nextCursor) {
      query.set("start_cursor", nextCursor);
    }

    const response = await notionRequest<NotionListResponse>(
      `/blocks/${blockId}/children?${query.toString()}`,
      token,
    );

    allBlocks.push(...response.results);
    nextCursor = response.has_more ? response.next_cursor : null;
  } while (nextCursor);

  return Promise.all(
    allBlocks.map(async (block) => {
      if (!block.has_children) {
        return block;
      }

      return {
        ...block,
        children: await fetchAllChildren(block.id, token),
      };
    }),
  );
}

function getBlockData(block: NotionBlockWithChildren): NotionBlockData {
  const raw = block[block.type];
  if (raw && typeof raw === "object") {
    return raw as NotionBlockData;
  }
  return {};
}

function richTextToMarkdown(richText: NotionRichText[] = []): string {
  return richText
    .map((rich) => {
      let value = rich.plain_text;
      const { annotations } = rich;

      if (annotations.code) value = `\`${value}\``;
      if (annotations.bold) value = `**${value}**`;
      if (annotations.italic) value = `*${value}*`;
      if (annotations.strikethrough) value = `~~${value}~~`;
      if (annotations.underline) value = `<u>${value}</u>`;

      if (annotations.color.endsWith("_background") && value.trim()) {
        value = `==${value}==`;
      }

      if (rich.href) {
        value = `[${value}](${rich.href})`;
      }

      return value;
    })
    .join("");
}

function renderBlocks(blocks: NotionBlockWithChildren[], depth = 0): string[] {
  const lines: string[] = [];
  let orderedIndex = 1;

  for (const block of blocks) {
    const data = getBlockData(block);
    const indent = "  ".repeat(depth);
    const text = richTextToMarkdown(data.rich_text);

    switch (block.type) {
      case "paragraph":
        lines.push(`${indent}${text}`);
        lines.push("");
        orderedIndex = 1;
        break;
      case "heading_1":
        lines.push(`${indent}# ${text}`);
        lines.push("");
        orderedIndex = 1;
        break;
      case "heading_2":
        lines.push(`${indent}## ${text}`);
        lines.push("");
        orderedIndex = 1;
        break;
      case "heading_3":
        lines.push(`${indent}### ${text}`);
        lines.push("");
        orderedIndex = 1;
        break;
      case "quote":
        lines.push(`${indent}> ${text}`);
        lines.push("");
        orderedIndex = 1;
        break;
      case "bulleted_list_item":
        lines.push(`${indent}- ${text}`);
        if (block.children?.length) {
          lines.push(...renderBlocks(block.children, depth + 1));
        }
        orderedIndex = 1;
        break;
      case "numbered_list_item":
        lines.push(`${indent}${orderedIndex}. ${text}`);
        orderedIndex += 1;
        if (block.children?.length) {
          lines.push(...renderBlocks(block.children, depth + 1));
        }
        break;
      case "to_do":
        lines.push(`${indent}- [${data.checked ? "x" : " "}] ${text}`);
        if (block.children?.length) {
          lines.push(...renderBlocks(block.children, depth + 1));
        }
        orderedIndex = 1;
        break;
      case "code": {
        const language = data.language ?? "text";
        lines.push(`${indent}\`\`\`${language}`);
        lines.push(text);
        lines.push(`${indent}\`\`\``);
        lines.push("");
        orderedIndex = 1;
        break;
      }
      case "divider":
        lines.push(`${indent}---`);
        lines.push("");
        orderedIndex = 1;
        break;
      case "callout":
        lines.push(`${indent}> [!NOTE] ${text}`);
        lines.push("");
        orderedIndex = 1;
        break;
      case "toggle":
        lines.push(`${indent}- ${text}`);
        if (block.children?.length) {
          lines.push(...renderBlocks(block.children, depth + 1));
        }
        lines.push("");
        orderedIndex = 1;
        break;
      case "equation":
        lines.push(`${indent}$$${data.expression ?? ""}$$`);
        lines.push("");
        orderedIndex = 1;
        break;
      case "bookmark":
      case "embed": {
        const url = data.url ?? "";
        if (url) {
          lines.push(`${indent}${url}`);
          lines.push("");
        }
        orderedIndex = 1;
        break;
      }
      case "image":
      case "file": {
        const sourceUrl = data.file?.url ?? data.external?.url;
        if (sourceUrl) {
          lines.push(`${indent}![Notion asset](${sourceUrl})`);
          lines.push("");
        }
        orderedIndex = 1;
        break;
      }
      case "child_page":
        lines.push(`${indent}## ${data.title ?? "Child page"}`);
        lines.push("");
        orderedIndex = 1;
        break;
      default:
        if (text.trim()) {
          lines.push(`${indent}${text}`);
          lines.push("");
        }
        orderedIndex = 1;
        break;
    }
  }

  return lines;
}

function pageTitleFromProperties(properties: Record<string, NotionPageProperty>): string {
  for (const property of Object.values(properties)) {
    if (property.type === "title" && property.title?.length) {
      return richTextToMarkdown(property.title).replaceAll("#", "").trim();
    }
  }

  return "Notion Export";
}

export async function fetchNotionPageAsMarkdown(
  token: string,
  rawPageIdOrUrl: string,
): Promise<{ title: string; markdown: string; pageId: string }> {
  const pageId = extractPageId(rawPageIdOrUrl);
  if (!pageId) {
    throw new Error("Could not parse a valid Notion page ID from the provided input.");
  }

  const page = await notionRequest<NotionPageResponse>(`/pages/${pageId}`, token);
  const blocks = await fetchAllChildren(pageId, token);
  const lines = renderBlocks(blocks).join("\n").trim();

  return {
    title: pageTitleFromProperties(page.properties),
    markdown: lines,
    pageId,
  };
}
