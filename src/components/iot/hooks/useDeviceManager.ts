import { useMemo } from "react";
import { useIoTContext } from "@/components/iot/IoTProvider";
import type { IoTDevice } from "@/types/iot";

export const useDeviceManager = () => {
  const { state } = useIoTContext();

  const { connected, connecting, disconnected, error } = useMemo(() => {
    const devices = state.devices;
    const status = {
      connected: [] as IoTDevice[],
      connecting: [] as IoTDevice[],
      disconnected: [] as IoTDevice[],
      error: [] as IoTDevice[],
    };

    for (const device of devices) {
      switch (device.connectionStatus) {
        case "connected":
          status.connected.push(device);
          break;
        case "connecting":
          status.connecting.push(device);
          break;
        case "disconnected":
          status.disconnected.push(device);
          break;
        case "error":
          status.error.push(device);
          break;
        default:
          status.disconnected.push(device);
          break;
      }
    }

    return status;
  }, [state.devices]);

  return {
    devices: state.devices,
    connected,
    connecting,
    disconnected,
    error,
  };
};

