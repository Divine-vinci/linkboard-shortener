// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

const { createHashMock, randomBytesMock } = vi.hoisted(() => ({
  createHashMock: vi.fn(),
  randomBytesMock: vi.fn(),
}));

vi.mock("node:crypto", () => ({
  createHash: createHashMock,
  randomBytes: randomBytesMock,
}));

const { generateApiKey, hashApiKey } = await import("@/lib/auth/api-key");

describe("src/lib/auth/api-key.ts", () => {
  it("hashes API keys with sha256", () => {
    const digestMock = vi.fn().mockReturnValue("hashed-value");
    const updateMock = vi.fn().mockReturnValue({ digest: digestMock });
    createHashMock.mockReturnValue({ update: updateMock });

    expect(hashApiKey("lb_secret")).toBe("hashed-value");
    expect(createHashMock).toHaveBeenCalledWith("sha256");
    expect(updateMock).toHaveBeenCalledWith("lb_secret");
    expect(digestMock).toHaveBeenCalledWith("hex");
  });

  it("generates a prefixed raw key with hash and prefix metadata", () => {
    const digestMock = vi.fn().mockReturnValue("hashed-value");
    const updateMock = vi.fn().mockReturnValue({ digest: digestMock });
    createHashMock.mockReturnValue({ update: updateMock });
    randomBytesMock.mockReturnValue({ toString: () => "a".repeat(64) });

    expect(generateApiKey()).toEqual({
      rawKey: `lb_${"a".repeat(64)}`,
      keyHash: "hashed-value",
      keyPrefix: "lb_aaaaa",
    });
  });
});
