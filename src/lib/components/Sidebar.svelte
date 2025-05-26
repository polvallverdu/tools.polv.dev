<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { cn } from "@/utils";
  import { Home, SquareTerminal, Palette } from "@lucide/svelte";
  import { SheetClose } from "./ui/sheet";

  interface Props {
    class?: string;
    onClick?: () => void;
  }

  const { class: className, onClick }: Props = $props();
  // Eventually, we might want to make this data-driven
  const tools = [
    { href: "/background-remover", label: "Background Remover", icon: SquareTerminal },
    { href: "/css-colors-checker", label: "CSS Colors Checker", icon: Palette },
  ];
</script>

<aside class={cn("bg-background flex h-full w-64 flex-col border-r p-4", className)}>
  <nav class="flex flex-col gap-2">
    <Button variant="ghost" href="/" class="justify-start" onclick={onClick}>
      <Home class="mr-2 h-4 w-4" />
      Home
    </Button>
    <h3 class="text-muted-foreground mt-4 px-4 text-sm font-semibold">Tools</h3>
    {#each tools as tool}
      <Button variant="ghost" href={tool.href} class="flex justify-start" onclick={onClick}>
        <tool.icon class="mr-2 h-4 w-4" />
        {tool.label}
      </Button>
    {/each}
  </nav>
</aside>
