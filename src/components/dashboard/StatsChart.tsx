import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

interface ChartData {
  date: string;
  signups: number;
  deposit: number;
}

const StatsChart = ({ data }: { data: ChartData[] }) => {
  return (
    <div className="rounded border border-border bg-card p-4">
      <h3 className="mb-4 font-display text-sm uppercase tracking-wider text-muted-foreground">
        ผลงานตลอดช่วงเวลา
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 15%)" />
          <XAxis dataKey="date" stroke="hsl(0 0% 55%)" fontSize={11} />
          <YAxis yAxisId="left" stroke="hsl(0 100% 50%)" fontSize={11} />
          <YAxis yAxisId="right" orientation="right" stroke="hsl(142 76% 36%)" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(0 0% 7%)",
              border: "1px solid hsl(0 0% 15%)",
              borderRadius: "4px",
              color: "hsl(0 0% 95%)",
            }}
          />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="signups" stroke="hsl(0, 100%, 50%)" strokeWidth={2} dot={false} name="ยอดสมัคร" />
          <Line yAxisId="right" type="monotone" dataKey="deposit" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={false} name="ยอดฝากรวม" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatsChart;
