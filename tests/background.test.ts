import { beforeEach, describe, expect, it, vi } from 'vitest';

const create = vi.fn();
const onClickedListeners: Array<(info: { menuItemId: string }) => void> = [];
const onMessageListeners: Array<(message: unknown, sender: unknown, sendResponse: (response: unknown) => void) => unknown> = [];
const openOptionsPage = vi.fn(async () => undefined);
vi.stubGlobal('defineBackground', (callback: () => void) => {
  callback();
  return callback;
});


vi.stubGlobal('chrome', {
  runtime: {
    onMessage: { addListener: (listener: typeof onMessageListeners[number]) => onMessageListeners.push(listener) },
    openOptionsPage,
  },
  contextMenus: {
    create,
    onClicked: { addListener: (listener: typeof onClickedListeners[number]) => onClickedListeners.push(listener) },
  },
  tabs: { query: vi.fn() },
  scripting: { executeScript: vi.fn() },
  storage: { session: { set: vi.fn(), get: vi.fn(), remove: vi.fn() } },
});

beforeEach(async () => {
  create.mockClear();
  openOptionsPage.mockClear();
  onClickedListeners.length = 0;
  onMessageListeners.length = 0;
  vi.resetModules();
  await import('../entrypoints/background');
});

describe('background settings menu', () => {
  it('registers an action-scoped settings item', () => {
    expect(create).toHaveBeenCalledWith({ id: 'open-settings', title: 'Settings', contexts: ['action'] });
    expect(onClickedListeners).toHaveLength(1);
  });

  it('opens settings only for the settings item and does not capture', async () => {
    const listener = onClickedListeners[0]!;
    listener({ menuItemId: 'other-item' });
    expect(openOptionsPage).not.toHaveBeenCalled();
    listener({ menuItemId: 'open-settings' });
    await Promise.resolve();
    expect(openOptionsPage).toHaveBeenCalledOnce();
    expect(onMessageListeners).toHaveLength(1);
  });
});
