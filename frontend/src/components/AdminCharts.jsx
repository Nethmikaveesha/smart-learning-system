import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";

function AdminCharts({ summary }) {
  const passFailData = [
    {
      name: "Pass",
      value: summary.passCount,
    },
    {
      name: "Fail",
      value: summary.failCount,
    },
  ];

  const attendanceData = [
    {
      name: "Attendance",
      value: Number(summary.averageAttendance),
    },
  ];

  const COLORS = ["#22c55e", "#ef4444"];

  return (
    <div className="grid md:grid-cols-2 gap-6 mt-8">
      {/* Pass vs Fail */}
      <div className="bg-white p-5 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">
          Pass vs Fail
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={passFailData}
              dataKey="value"
              outerRadius={100}
              label
            >
              {passFailData.map((entry, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index]}
                />
              ))}
            </Pie>

            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Attendance */}
      <div className="bg-white p-5 rounded-xl shadow">
        <h2 className="text-xl font-bold mb-4">
          Average Attendance
        </h2>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={attendanceData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />

            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default AdminCharts;