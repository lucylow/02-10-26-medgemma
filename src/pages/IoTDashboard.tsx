import { useNavigate } from "react-router-dom";
import { useMockIoTData } from "@/hooks/useMockIoTData";
import { IoTDashboardShell } from "@/components/iot/layout/IoTDashboardShell";
import { PatientCardGrid } from "@/components/iot/patients/PatientCardGrid";

export function IoTDashboardPage() {
  const navigate = useNavigate();
  const { loading, patients, allDevices, alertsByPatient } = useMockIoTData();

  const complianceEvents = patients.flatMap((p) => p.compliance);
  const complianceCompleted = complianceEvents.filter((e) => e.completed).length;
  const complianceRate =
    complianceEvents.length === 0
      ? 0
      : Math.round((complianceCompleted / complianceEvents.length) * 100);

  return (
    <IoTDashboardShell
      patients={patients}
      devices={allDevices}
      loading={loading}
      complianceRate={complianceRate}
      onSelectPatient={(id) => {
        navigate(`/iot-dashboard?patient=${encodeURIComponent(id)}`);
      }}
    >
      <PatientCardGrid
        patients={patients}
        alertsByPatient={alertsByPatient}
        loading={loading}
      />
    </IoTDashboardShell>
  );
}

export default IoTDashboardPage;


