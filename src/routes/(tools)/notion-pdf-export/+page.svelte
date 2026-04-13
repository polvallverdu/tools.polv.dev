<script lang="ts">
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { toast } from "svelte-sonner";
  import { Download, FileText, Loader2, Sparkles } from "@lucide/svelte";
  import {
    exportMarkdownToPdf,
    markdownToHtml,
    renderMermaidBlocks,
  } from "@/tools/notionPdfExport/exportPdf";
  import {
    fetchNotionPageAsMarkdown,
    fetchPublicNotionPageAsMarkdown,
  } from "@/tools/notionPdfExport/notion";
  import SvelteSeo from "svelte-seo";

  let notionToken = $state("");
  let pageInput = $state("");
  let usePublicPageMode = $state(false);
  let documentTitle = $state("Notion Export");
  let fileName = $state("notion-export.pdf");
  let markdown = $state(`# Example Notion Export

This tool exports markdown to a styled PDF.

## Mermaid support
\`\`\`mermaid
flowchart LR
  A[Notion page] --> B[Markdown conversion]
  B --> C[Styled PDF export]
\`\`\`

Use your Notion integration token and page URL above to fetch real content.`);
  let useGoldHighlight = $state(true);
  let isLoadingFromNotion = $state(false);
  let isExporting = $state(false);
  let previewRoot = $state<HTMLElement | null>(null);

  const previewHtml = $derived(markdownToHtml(markdown, { useGoldHighlight }));
  const canFetch = $derived(
    Boolean(pageInput.trim() && !isLoadingFromNotion && (usePublicPageMode || notionToken.trim())),
  );
  const canExport = $derived(Boolean(markdown.trim()) && !isExporting);

  function slugify(text: string): string {
    const slug = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || "notion-export";
  }

  async function fetchFromNotion(): Promise<void> {
    if (!canFetch) return;

    isLoadingFromNotion = true;
    try {
      const result = usePublicPageMode
        ? await fetchPublicNotionPageAsMarkdown(pageInput.trim())
        : await fetchNotionPageAsMarkdown(notionToken.trim(), pageInput.trim());
      markdown = result.markdown || "_This Notion page appears empty._";
      documentTitle = result.title || "Notion Export";
      fileName = `${slugify(documentTitle)}.pdf`;
      if (result.pageId) {
        toast.success(`Fetched page ${result.pageId.slice(0, 8)}… from Notion`);
      } else {
        toast.success("Fetched public Notion page");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch the Notion page with the selected mode.";
      toast.error(message);
    } finally {
      isLoadingFromNotion = false;
    }
  }

  async function exportPdf(): Promise<void> {
    if (!canExport) return;

    isExporting = true;
    try {
      await exportMarkdownToPdf({
        markdown,
        title: documentTitle.trim() || "Notion Export",
        fileName: fileName.trim() || "notion-export.pdf",
        useGoldHighlight,
      });
      toast.success("PDF exported");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export PDF";
      toast.error(message);
    } finally {
      isExporting = false;
    }
  }

  function resetToExample(): void {
    markdown = `# Example Notion Export

This tool exports markdown to a styled PDF.

## Mermaid support
\`\`\`mermaid
sequenceDiagram
  participant U as User
  participant N as Notion API
  participant P as PDF Exporter
  U->>N: Fetch page with token
  N-->>P: Blocks and text
  P-->>U: Styled PDF
\`\`\`

Try ==gold highlights== by toggling the option on the right.`;
    documentTitle = "Notion Export Example";
    fileName = "notion-export-example.pdf";
  }

  $effect(() => {
    if (!previewRoot) return;

    previewRoot.innerHTML = previewHtml;
    void renderMermaidBlocks(previewRoot);
  });
</script>

<SvelteSeo
  title="Notion PDF Export | Pol Tools"
  description="Export a Notion page to a styled PDF with markdown editing, Mermaid rendering, and optional gold highlights."
/>

<div class="container mx-auto max-w-6xl space-y-6 pb-8">
  <div class="space-y-2 text-center">
    <h1 class="text-3xl font-bold">Notion PDF Export</h1>
    <p class="text-muted-foreground">
      Fetch a Notion page with your integration token, tweak the markdown, and export a styled PDF.
    </p>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2"
          ><FileText class="h-4 w-4" /> Notion Source</CardTitle
        >
        <CardDescription>
          Use token mode for private pages, or public mode for shared pages without a token.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            bind:checked={usePublicPageMode}
            class="accent-primary h-4 w-4 rounded"
          />
          Public page mode (no token, uses r.jina.ai reader proxy)
        </label>

        <div class="space-y-2">
          <Label for="notion-token">Notion token</Label>
          <Input
            id="notion-token"
            type="password"
            bind:value={notionToken}
            placeholder="secret_..."
            autocomplete="off"
            disabled={usePublicPageMode}
          />
          <p class="text-muted-foreground text-xs">
            {#if usePublicPageMode}
              Public mode sends the URL to r.jina.ai to convert it into markdown.
            {:else}
              Token is used only in your browser session and is not stored.
            {/if}
          </p>
        </div>

        <div class="space-y-2">
          <Label for="page-url">Page URL or ID</Label>
          <Input
            id="page-url"
            bind:value={pageInput}
            placeholder="https://www.notion.so/... or 01234567-89ab-cdef-0123-456789abcdef"
          />
        </div>

        <div class="space-y-2">
          <Label for="document-title">Document title</Label>
          <Input id="document-title" bind:value={documentTitle} placeholder="Notion Export" />
        </div>

        <div class="flex flex-wrap gap-2">
          <Button onclick={fetchFromNotion} disabled={!canFetch}>
            {#if isLoadingFromNotion}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              Fetching...
            {:else}
              <FileText class="mr-2 h-4 w-4" />
              {usePublicPageMode ? "Fetch public page" : "Fetch from Notion"}
            {/if}
          </Button>
          <Button variant="outline" onclick={resetToExample}>
            <Sparkles class="mr-2 h-4 w-4" />
            Load example
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="flex items-center gap-2"
          ><Download class="h-4 w-4" /> Export Settings</CardTitle
        >
        <CardDescription
          >Control output filename and highlight style before PDF export.</CardDescription
        >
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="file-name">File name</Label>
          <Input id="file-name" bind:value={fileName} placeholder="notion-export.pdf" />
        </div>

        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            bind:checked={useGoldHighlight}
            class="accent-primary h-4 w-4 rounded"
          />
          Enable ==gold highlight== styling
        </label>

        <Button onclick={exportPdf} disabled={!canExport}>
          {#if isExporting}
            <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            Exporting...
          {:else}
            <Download class="mr-2 h-4 w-4" />
            Export PDF
          {/if}
        </Button>

        <p class="text-muted-foreground text-xs">
          Mermaid blocks in markdown (<code>\`\`\`mermaid</code>) are rendered as diagrams before
          export.
        </p>
      </CardContent>
    </Card>
  </div>

  <div class="grid gap-4 lg:grid-cols-2">
    <Card>
      <CardHeader>
        <CardTitle>Markdown</CardTitle>
        <CardDescription>Edit the markdown before generating your PDF.</CardDescription>
      </CardHeader>
      <CardContent>
        <textarea
          bind:value={markdown}
          class="border-input bg-background min-h-[520px] w-full rounded-md border p-3 font-mono text-sm"
          spellcheck="false"
        ></textarea>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Preview</CardTitle>
        <CardDescription>Live preview with Mermaid rendering.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          bind:this={previewRoot}
          class="min-h-[520px] space-y-3 overflow-auto rounded-md border p-4 [&_blockquote]:border-l-4 [&_blockquote]:pl-3 [&_code]:font-mono [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_mark.gold-highlight]:rounded [&_mark.gold-highlight]:bg-[#f3d66b] [&_ol]:list-decimal [&_ol]:pl-6 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-slate-50 [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-6"
        ></div>
      </CardContent>
    </Card>
  </div>
</div>
