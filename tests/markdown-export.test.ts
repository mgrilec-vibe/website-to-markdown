import { describe, expect, it, vi } from 'vitest';
import { copyMarkdown, downloadMarkdown, markdownFilename } from '../src/markdown-export';

describe('Markdown export actions', () => {
  it('copies the exact Markdown string', async () => {
    const clipboard = { writeText: vi.fn(async () => undefined) };
    const markdown = '---\ntitle: "Exact bytes"\n---\n\n# Result\n';

    await copyMarkdown(markdown, clipboard);

    expect(clipboard.writeText).toHaveBeenCalledWith(markdown);
  });

  it('downloads UTF-8 Markdown bytes with a safe filename and delayed revocation', async () => {
    const downloaded: { url: string; filename: string; conflictAction: 'uniquify'; saveAs: true }[] = [];
    const downloads = { download: vi.fn(async (options) => { downloaded.push(options); }) };
    let createdBlob: Blob | undefined;
    const objectUrl = {
      createObjectURL: vi.fn((blob: Blob) => {
        createdBlob = blob;
        return 'blob:markdown-preview';
      }),
      revokeObjectURL: vi.fn(),
    };
    const schedule = vi.fn((callback: () => void, delay: number) => {
      expect(delay).toBe(1_000);
      callback();
      return 0;
    });
    const markdown = '---\ntitle: "Exact bytes"\n---\n\n# Result\n';

    await downloadMarkdown(markdown, 'Résumé / export!', downloads, objectUrl, schedule);

    expect(await createdBlob?.text()).toBe(markdown);
    expect(downloaded).toEqual([{
      url: 'blob:markdown-preview',
      filename: 'Resume-export.md',
      conflictAction: 'uniquify',
      saveAs: true,
    }]);
    expect(objectUrl.revokeObjectURL).toHaveBeenCalledWith('blob:markdown-preview');
  });

  it('normalizes empty download titles to page.md', () => {
    expect(markdownFilename(' /// ')).toBe('page.md');
  });
});
