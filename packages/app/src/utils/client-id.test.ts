import { beforeEach, describe, expect, it, vi } from "vitest";

const asyncStorageMock = vi.hoisted(() => ({
  getItem: vi.fn<(_: string) => Promise<string | null>>(),
  setItem: vi.fn<(_: string, __: string) => Promise<void>>(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: asyncStorageMock,
}));

describe("client-id", () => {
  beforeEach(() => {
    vi.resetModules();
    asyncStorageMock.getItem.mockReset();
    asyncStorageMock.setItem.mockReset();
  });

  it("returns stored client id when present", async () => {
    asyncStorageMock.getItem.mockResolvedValue("cid_existing");
    const mod = await import("./client-id");

    const key = await mod.getOrCreateClientId();
    expect(key).toBe("cid_existing");
    expect(asyncStorageMock.getItem).toHaveBeenCalledTimes(1);
    expect(asyncStorageMock.setItem).not.toHaveBeenCalled();
  });

  it("creates and persists a client id when missing", async () => {
    asyncStorageMock.getItem.mockResolvedValue(null);
    asyncStorageMock.setItem.mockResolvedValue();

    const mod = await import("./client-id");
    const key = await mod.getOrCreateClientId();

    expect(key).toMatch(/^cid_/);
    expect(asyncStorageMock.setItem).toHaveBeenCalledWith("@paseo:client-id-v1", key);
  });
});
