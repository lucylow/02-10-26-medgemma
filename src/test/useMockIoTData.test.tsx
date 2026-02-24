import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMockIoTData, buildMockIoTData } from "@/hooks/useMockIoTData";

describe("useMockIoTData", () => {
  it("buildMockIoTData returns 5 patients and multiple devices", () => {
    const data = buildMockIoTData(new Date("2024-01-01T08:00:00Z"));
    expect(data.patients.length).toBe(5);
    expect(data.allDevices.length).toBeGreaterThanOrEqual(5);
  });

  it("hook eventually returns hydrated data", async () => {
    const { result } = renderHook(() => useMockIoTData());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.patients.length).toBe(5);
    expect(Object.keys(result.current.alertsByPatient).length).toBeGreaterThan(
      0,
    );
  });
});

