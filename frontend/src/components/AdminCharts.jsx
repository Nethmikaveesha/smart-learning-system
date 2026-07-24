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

const PASS_FAIL_COLORS = ["#16a34a", "#dc2626"];
const ATTENDANCE_COLOR = "#2563eb";

function AdminCharts({ summary }) {
  const passFailData = [
    { name: "Pass", value: Number(summary?.passCount || 0) },
    { name: "Fail", value: Number(summary?.failCount || 0) },
  ];

  const attendanceValue = Number(summary?.averageAttendance || 0);

  const attendanceData = [
    {
      name: "Average Attendance",
      value: attendanceValue,
    },
  ];

  const hasPassFailData = passFailData.some((item) => item.value > 0);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard
        title="Pass vs Fail"
        description="Overall student result distribution across published examinations."
      >
        <div className="h-80">
          {hasPassFailData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 8, right: 8, bottom: 24, left: 8 }}>
                <Pie
                  data={passFailData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  innerRadius={62}
                  outerRadius={92}
                  paddingAngle={3}
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
            <EmptyChart message="No result distribution available yet." />
          )}
        </div>
      </ChartCard>

      <ChartCard
        title="Average Attendance"
        description="Average student attendance percentage based on current records."
      >
        <div className="h-80">
          {attendanceValue > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={attendanceData}
                margin={{ top: 20, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  formatter={(value) => [
                    `${Number(value).toFixed(2)}%`,
                    "Attendance",
                  ]}
                />
                <Bar
                  dataKey="value"
                  fill={ATTENDANCE_COLOR}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={72}
                >
                  <LabelList
                    dataKey="value"
                    position="top"
                    formatter={(value) => `${Number(value).toFixed(2)}%`}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No attendance summary available yet." />
          )}
        </div>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ message }) {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
      <p className="text-sm font-semibold text-slate-500">{message}</p>
    </div>
  );
}

export default AdminCharts;