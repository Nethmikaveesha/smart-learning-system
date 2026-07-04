import { useEffect, useState } from "react";
import axios from "axios";

const RiskDashboard = () => {
  const [risks, setRisks] = useState([]);

  useEffect(() => {
    fetchRisks();
  }, []);

  const fetchRisks = async () => {
    try {
      const res = await axios.get("http://localhost:5001/api/risk");
      setRisks(res.data.data);
    } catch (error) {
      console.error("Failed to fetch risks", error);
    }
  };

  const highRisk = risks.filter((r) => r.riskLevel === "High Risk").length;
  const mediumRisk = risks.filter((r) => r.riskLevel === "Medium Risk").length;
  const lowRisk = risks.filter((r) => r.riskLevel === "Low Risk").length;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Student Risk Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-xl p-4">
          <p className="text-gray-500">Total Predictions</p>
          <h2 className="text-3xl font-bold">{risks.length}</h2>
        </div>

        <div className="bg-white shadow rounded-xl p-4">
          <p className="text-gray-500">High Risk</p>
          <h2 className="text-3xl font-bold">{highRisk}</h2>
        </div>

        <div className="bg-white shadow rounded-xl p-4">
          <p className="text-gray-500">Medium Risk</p>
          <h2 className="text-3xl font-bold">{mediumRisk}</h2>
        </div>

        <div className="bg-white shadow rounded-xl p-4">
          <p className="text-gray-500">Low Risk</p>
          <h2 className="text-3xl font-bold">{lowRisk}</h2>
        </div>
      </div>

      <div className="bg-white shadow rounded-xl p-4">
        <h2 className="text-xl font-semibold mb-4">Saved Risk Predictions</h2>

        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Student ID</th>
                <th className="border p-2 text-left">Performance Class</th>
                <th className="border p-2 text-left">Risk Level</th>
                <th className="border p-2 text-left">Date</th>
              </tr>
            </thead>

            <tbody>
              {risks.map((risk) => (
                <tr key={risk._id}>
                  <td className="border p-2">{risk.studentId}</td>
                  <td className="border p-2">{risk.performanceClass}</td>
                  <td className="border p-2 font-semibold">
                    {risk.riskLevel}
                  </td>
                  <td className="border p-2">
                    {new Date(risk.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {risks.length === 0 && (
            <p className="text-center text-gray-500 mt-4">
              No risk predictions found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskDashboard;