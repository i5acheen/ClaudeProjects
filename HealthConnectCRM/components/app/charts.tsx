"use client";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function FunnelChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <div className="h-64" role="img" aria-label={data.map((d) => `${d.name}: ${d.value}`).join(", ")}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={110} />
          <Tooltip />
          <Bar dataKey="value" fill="#0f6b5c" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ResponseChart({ data }: { data: { day: string; minutes: number }[] }) {
  return (
    <div className="h-56" role="img" aria-label="Median minutes to first reply per day">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="minutes" stroke="#0f6b5c" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CallsChart({ data }: { data: { day: string; calls: number; connected: number }[] }) {
  return (
    <div className="h-56" role="img" aria-label={data.map((d) => `${d.day}: ${d.calls} calls, ${d.connected} connected`).join("; ")}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="calls" name="Calls" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          <Bar dataKey="connected" name="Connected" fill="#0f6b5c" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
