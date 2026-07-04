import { useEffect, useState } from "react";
import axios from "axios";

const RiskDashboard = () => {
  const [xapiRisks, setXapiRisks] = useState([]);
  const [finalRisks, setFinalRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRiskData();
  }, []);

  const fetchRiskData = async () => {
    try {
      setLoading(true);
      setError("");

      const [xapiResponse, finalResponse] = await Promise.all([
        axios.get("http://localhost:5001/api/risk"),
        axios.get("http://localhost:5001/api/risk/final"),
      ]);

      setXapiRisks(xapiResponse.data.data || []);
      setFinalRisks(finalResponse.data.data || []);
    } catch (err) {
      console.error("Failed to fetch risk data:", err);
      setError("Failed to load risk prediction data.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // xAPI MODEL COUNTS
  // =====================================================

  const xapiHighRisk = xapiRisks.filter(
    (item) => item.riskLevel === "High Risk"
  ).length;

  const xapiMediumRisk = xapiRisks.filter(
    (item) => item.riskLevel === "Medium Risk"
  ).length;

  const xapiLowRisk = xapiRisks.filter(
    (item) => item.riskLevel === "Low Risk"
  ).length;

  // =====================================================
  // FINAL PASS/FAIL MODEL COUNTS
  // =====================================================

  const finalHighRisk = finalRisks.filter(
    (item) => item.riskLevel === "High Risk"
  ).length;

  const finalLowRisk = finalRisks.filter(
    (item) => item.riskLevel === "Low Risk"
  ).length;

  const passCount = finalRisks.filter(
    (item) => item.predictedResult === "Pass"
  ).length;

  const failCount = finalRisks.filter(
    (item) => item.predictedResult === "Fail"
  ).length;

  const getRiskBadge = (riskLevel) => {
    if (riskLevel === "High Risk") {
      return "bg-red-100 text-red-700";
    }

    if (riskLevel === "Medium Risk") {
      return "bg-yellow-100 text-yellow-700";
    }

    return "bg-green-100 text-green-700";
  };

  const getResultBadge = (result) => {
    if (result === "Pass") {
      return "bg-green-100 text-green-700";
    }

    return "bg-red-100 text-red-700";
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-600">
          Loading risk prediction dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Student Risk Dashboard
            </h1>

            <p className="text-gray-500 mt-1">
              ML-based student performance and academic risk analysis
            </p>
          </div>

          <button
            onClick={fetchRiskData}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* =================================================
            MODEL 1: xAPI SUMMARY
        ================================================= */}

        <div className="mb-10">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Model 1 — xAPI Performance Classification
            </h2>

            <p className="text-gray-500">
              Benchmark model using learning behaviour and engagement data
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

            <div className="bg-white shadow rounded-xl p-5">
              <p className="text-gray-500">
                Total Predictions
              </p>

              <h3 className="text-3xl font-bold mt-2">
                {xapiRisks.length}
              </h3>
            </div>

            <div className="bg-white shadow rounded-xl p-5">
              <p className="text-red-600">
                High Risk
              </p>

              <h3 className="text-3xl font-bold mt-2">
                {xapiHighRisk}
              </h3>
            </div>

            <div className="bg-white shadow rounded-xl p-5">
              <p className="text-yellow-600">
                Medium Risk
              </p>

              <h3 className="text-3xl font-bold mt-2">
                {xapiMediumRisk}
              </h3>
            </div>

            <div className="bg-white shadow rounded-xl p-5">
              <p className="text-green-600">
                Low Risk
              </p>

              <h3 className="text-3xl font-bold mt-2">
                {xapiLowRisk}
              </h3>
            </div>
          </div>

          <div className="bg-white shadow rounded-xl overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="text-xl font-semibold">
                xAPI Prediction Records
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">
                      Student ID
                    </th>

                    <th className="p-3 text-left">
                      Performance Class
                    </th>

                    <th className="p-3 text-left">
                      Risk Level
                    </th>

                    <th className="p-3 text-left">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {xapiRisks.map((risk) => (
                    <tr
                      key={risk._id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="p-3">
                        {risk.studentId}
                      </td>

                      <td className="p-3 font-semibold">
                        {risk.performanceClass}
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskBadge(
                            risk.riskLevel
                          )}`}
                        >
                          {risk.riskLevel}
                        </span>
                      </td>

                      <td className="p-3">
                        {new Date(
                          risk.createdAt
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {xapiRisks.length === 0 && (
                <p className="text-center text-gray-500 p-6">
                  No xAPI prediction records found.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            MODEL 2: FINAL PASS/FAIL MODEL
        ================================================= */}

        <div>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Model 2 — Final Pass/Fail Risk Prediction
            </h2>

            <p className="text-gray-500">
              Project-aligned model using attendance and academic indicators
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">

            <div className="bg-white shadow rounded-xl p-5">
              <p className="text-gray-500">
                Total Predictions
              </p>

              <h3 className="text-3xl font-bold mt-2">
                {finalRisks.length}
              </h3>
            </div>

            <div className="bg-white shadow rounded-xl p-5">
              <p className="text-green-600">
                Predicted Pass
              </p>

              <h3 className="text-3xl font-bold mt-2">
                {passCount}
              </h3>
            </div>

            <div className="bg-white shadow rounded-xl p-5">
              <p className="text-red-600">
                Predicted Fail
              </p>

              <h3 className="text-3xl font-bold mt-2">
                {failCount}
              </h3>
            </div>

            <div className="bg-white shadow rounded-xl p-5">
              <p className="text-red-600">
                High Risk
              </p>

              <h3 className="text-3xl font-bold mt-2">
                {finalHighRisk}
              </h3>
            </div>

            <div className="bg-white shadow rounded-xl p-5">
              <p className="text-green-600">
                Low Risk
              </p>

              <h3 className="text-3xl font-bold mt-2">
                {finalLowRisk}
              </h3>
            </div>
          </div>

          <div className="bg-white shadow rounded-xl overflow-hidden">
            <div className="p-5 border-b">
              <h3 className="text-xl font-semibold">
                Final Risk Prediction Records
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">
                      Student ID
                    </th>

                    <th className="p-3 text-left">
                      Attendance
                    </th>

                    <th className="p-3 text-left">
                      Homework
                    </th>

                    <th className="p-3 text-left">
                      Midterm
                    </th>

                    <th className="p-3 text-left">
                      Study Hours
                    </th>

                    <th className="p-3 text-left">
                      Result
                    </th>

                    <th className="p-3 text-left">
                      Risk Level
                    </th>

                    <th className="p-3 text-left">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {finalRisks.map((risk) => (
                    <tr
                      key={risk._id}
                      className="border-t hover:bg-gray-50"
                    >
                      <td className="p-3">
                        {risk.studentId}
                      </td>

                      <td className="p-3">
                        {risk.inputData?.attendance_pct}%
                      </td>

                      <td className="p-3">
                        {risk.inputData?.homework_pct}%
                      </td>

                      <td className="p-3">
                        {risk.inputData?.midterm_score}
                      </td>

                      <td className="p-3">
                        {risk.inputData?.study_hours_per_week}
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${getResultBadge(
                            risk.predictedResult
                          )}`}
                        >
                          {risk.predictedResult}
                        </span>
                      </td>

                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskBadge(
                            risk.riskLevel
                          )}`}
                        >
                          {risk.riskLevel}
                        </span>
                      </td>

                      <td className="p-3">
                        {new Date(
                          risk.createdAt
                        ).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {finalRisks.length === 0 && (
                <p className="text-center text-gray-500 p-6">
                  No final risk prediction records found.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RiskDashboard;