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
  CartesianGrid,
  LabelList,
} from "recharts";

const PASS_FAIL_COLORS = ["#22c55e", "#ef4444"];
const ATTENDANCE_COLOR = "#2563eb";

function AdminCharts({ summary }) {
  const passFailData = [
    { name: "Pass", value: summary.passCount },
    { name: "Fail", value: summary.failCount },
  ];

  const attendanceData = [
    {
      name: "Attendance",
      value: Number(summary.averageAttendance),
    },
  ];

  const hasPassFailData = passFailData.some((item) => item.value > 0);

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-2">
      <div className="overflow-hidden rounded-xl bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-bold">Pass vs Fail</h2>

        <div className="relative h-80">
          {hasPassFailData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
                <Pie
                  data={passFailData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={2}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {passFailData.map((entry, index) => (
                    <Cell key={entry.name} fill={PASS_FAIL_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={28} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No results available
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white p-5 shadow">
        <h2 className="mb-4 text-xl font-bold">Average Attendance</h2>

        <div className="relative h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={attendanceData}
              margin={{ top: 16, right: 16, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, "Attendance"]} />
              <Bar
                dataKey="value"
                fill={ATTENDANCE_COLOR}
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              >
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(value) => `${Number(value).toFixed(2)}%`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default AdminCharts;
