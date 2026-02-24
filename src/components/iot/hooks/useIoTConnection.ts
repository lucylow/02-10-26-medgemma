import { useIoTContext } from "@/components/iot/IoTProvider";

export const useIoTConnection = () => {
  const { state } = useIoTContext();
  return {
    isConnected: state.isConnected,
  };
};

