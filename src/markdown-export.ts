export interface MarkdownClipboard {
  writeText(markdown: string): Promise<void>;
}

export interface MarkdownDownloadClient {
  download(options: {
    readonly url: string;
    readonly filename: string;
    readonly conflictAction: 'uniquify';
    readonly saveAs: true;
  }): Promise<unknown>;
}

export interface MarkdownObjectUrl {
  createObjectURL(value: Blob): string;
  revokeObjectURL(url: string): void;
}

export function markdownFilename(title: string): string {
  const normalized = title.normalize('NFKD').replace(/\p{M}+/gu, '').replace(/[^\w.-]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 80);
  return `${normalized || 'page'}.md`;
}

export function copyMarkdown(markdown: string, clipboard: MarkdownClipboard): Promise<void> {
  return clipboard.writeText(markdown);
}

export async function downloadMarkdown(
  markdown: string,
  title: string,
  downloads: MarkdownDownloadClient,
  objectUrl: MarkdownObjectUrl,
  schedule: (callback: () => void, delay: number) => unknown,
): Promise<void> {
  const url = objectUrl.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
  try {
    await downloads.download({ url, filename: markdownFilename(title), conflictAction: 'uniquify', saveAs: true });
  } finally {
    schedule(() => objectUrl.revokeObjectURL(url), 1_000);
  }
}
