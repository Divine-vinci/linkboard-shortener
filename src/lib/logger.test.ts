import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { logger } from "@/lib/logger";

describe("logger", () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it("emits structured JSON with level, message, and timestamp", () => {
    logger.info("test message");

    expect(writeSpy).toHaveBeenCalledOnce();
    const output = JSON.parse((writeSpy.mock.calls[0][0] as string).trim());
    expect(output.level).toBe("info");
    expect(output.message).toBe("test message");
    expect(output.timestamp).toBeDefined();
  });

  it("includes context fields in the log entry", () => {
    logger.error("failure", { requestId: "abc-123", statusCode: 500 });

    const output = JSON.parse((writeSpy.mock.calls[0][0] as string).trim());
    expect(output.level).toBe("error");
    expect(output.requestId).toBe("abc-123");
    expect(output.statusCode).toBe(500);
  });

  it("exposes debug, info, warn, and error methods", () => {
    expect(typeof logger.debug).toBe("function");
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });
});
