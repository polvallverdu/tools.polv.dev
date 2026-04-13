import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { marked } from "marked";
import mermaid from "mermaid";

interface RenderOptions {
  useGoldHighlight: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function withGoldHighlights(markdown: string, enabled: boolean): string {
  if (!enabled) {
    return markdown;
  }

  return markdown.replace(/==([^=\n][\s\S]*?)==/g, '<mark class="gold-highlight">$1</mark>');
}

export function markdownToHtml(markdown: string, options: RenderOptions): string {
  const normalizedMermaid = markdown.replace(
    /```mermaid\s*([\s\S]*?)```/gi,
    (_, diagram: string) => {
      return `<div class="mermaid">${escapeHtml(diagram.trim())}</div>`;
    },
  );

  const withHighlights = withGoldHighlights(normalizedMermaid, options.useGoldHighlight);
  const parsed = marked.parse(withHighlights, { gfm: true, breaks: true });
  return typeof parsed === "string" ? parsed : "";
}

export async function renderMermaidBlocks(container: HTMLElement): Promise<void> {
  const blocks = Array.from(container.querySelectorAll<HTMLElement>(".mermaid"));
  if (!blocks.length) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "neutral",
  });

  await Promise.all(
    blocks.map(async (block, index) => {
      const code = block.textContent?.trim();
      if (!code) return;

      const chartId = `mermaid-chart-${index}-${crypto.randomUUID().replaceAll("-", "")}`;
      try {
        const { svg } = await mermaid.render(chartId, code);
        block.innerHTML = svg;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to render Mermaid diagram";
        block.innerHTML = `<pre class="mermaid-error">${escapeHtml(message)}</pre>`;
      }
    }),
  );
}

function createPrintableContainer(title: string, html: string): HTMLElement {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.background = "#ffffff";
  container.style.padding = "40px 48px";
  container.style.color = "#0f172a";
  container.style.fontFamily =
    "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif";
  container.innerHTML = `
    <style>
      .notion-pdf-export article { line-height: 1.6; }
      .notion-pdf-export h1, .notion-pdf-export h2, .notion-pdf-export h3 { margin: 1.2rem 0 0.5rem; line-height: 1.25; }
      .notion-pdf-export h1 { font-size: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem; margin-top: 0; }
      .notion-pdf-export h2 { font-size: 1.5rem; }
      .notion-pdf-export h3 { font-size: 1.25rem; }
      .notion-pdf-export p, .notion-pdf-export ul, .notion-pdf-export ol, .notion-pdf-export pre, .notion-pdf-export blockquote { margin: 0.7rem 0; }
      .notion-pdf-export ul, .notion-pdf-export ol { padding-left: 1.2rem; }
      .notion-pdf-export pre { padding: 0.8rem; border-radius: 0.4rem; background: #f8fafc; border: 1px solid #e2e8f0; overflow-x: auto; }
      .notion-pdf-export code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .notion-pdf-export blockquote { border-left: 4px solid #cbd5e1; padding-left: 0.8rem; color: #334155; }
      .notion-pdf-export hr { border: 0; border-top: 1px solid #cbd5e1; margin: 1.2rem 0; }
      .notion-pdf-export .gold-highlight { background: #f3d66b; padding: 0 0.15rem; border-radius: 0.2rem; }
      .notion-pdf-export .mermaid-error { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 0.3rem; padding: 0.5rem; }
      .notion-pdf-export img { max-width: 100%; border-radius: 0.4rem; }
      .notion-pdf-export table { border-collapse: collapse; width: 100%; margin: 0.8rem 0; }
      .notion-pdf-export th, .notion-pdf-export td { border: 1px solid #cbd5e1; padding: 0.4rem; text-align: left; }
    </style>
    <div class="notion-pdf-export">
      <article>
        <h1>${escapeHtml(title)}</h1>
        ${html}
      </article>
    </div>
  `;

  return container;
}

function canvasToPdf(canvas: HTMLCanvasElement, fileName: string): void {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const printableWidth = pageWidth - margin * 2;
  const printableHeight = pageHeight - margin * 2;
  const scale = printableWidth / canvas.width;
  const sourceSliceHeight = Math.floor(printableHeight / scale);

  let sourceY = 0;
  let page = 0;

  while (sourceY < canvas.height) {
    const sliceHeight = Math.min(sourceSliceHeight, canvas.height - sourceY);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;

    const context = pageCanvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create intermediate canvas context for PDF rendering.");
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    context.drawImage(
      canvas,
      0,
      sourceY,
      canvas.width,
      sliceHeight,
      0,
      0,
      pageCanvas.width,
      pageCanvas.height,
    );

    const image = pageCanvas.toDataURL("image/png", 1);
    if (page > 0) {
      pdf.addPage();
    }

    pdf.addImage(
      image,
      "PNG",
      margin,
      margin,
      printableWidth,
      sliceHeight * scale,
      undefined,
      "FAST",
    );
    sourceY += sliceHeight;
    page += 1;
  }

  const finalName = fileName.toLowerCase().endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  pdf.save(finalName);
}

export async function exportMarkdownToPdf(params: {
  markdown: string;
  title: string;
  fileName: string;
  useGoldHighlight: boolean;
}): Promise<void> {
  const { markdown, title, fileName, useGoldHighlight } = params;
  const html = markdownToHtml(markdown, { useGoldHighlight });
  const container = createPrintableContainer(title, html);
  document.body.appendChild(container);

  try {
    await renderMermaidBlocks(container);
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: container.scrollWidth,
      windowHeight: container.scrollHeight,
    });

    canvasToPdf(canvas, fileName);
  } finally {
    container.remove();
  }
}
