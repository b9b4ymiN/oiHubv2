"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface OptionsFlowData {
  timestamp: number;
  callFlow: number;
  putFlow: number;
  netFlow: number;
}

interface OptionsFlowChartProps {
  data: OptionsFlowData[];
  height?: number;
}

export function OptionsFlowChart({ data, height = 400 }: OptionsFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="timestamp"
          tickFormatter={(value) => new Date(value * 1000).toLocaleTimeString()}
          tick={{ fontSize: 10 }}
        />
        <YAxis tickFormatter={(value) => value.toLocaleString()} tick={{ fontSize: 10 }} />
        <Tooltip
          content={({ payload, active }) => {
            if (active && payload && payload.length > 0) {
              const data = payload[0].payload;
              const { timestamp, callFlow, putFlow, netFlow } = data;
              const totalFlow = Math.abs(callFlow) + Math.abs(putFlow);
              const flowPct = totalFlow > 0 ? Math.abs((callFlow - putFlow) / totalFlow) * 100 : 0;
              
              return (
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
                  <div className="text-center mb-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Time: {new Date(timestamp * 1000).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-left">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Call Flow: {callFlow.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {flowPct > 50 ? (
                          <span className="text-green-600 dark:text-green-400">Bullish</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">Bearish</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {callFlow.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {flowPct > 50 ? (
                          <span className="text-green-600 dark:text-green-400">High</span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Low</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Put Flow */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-left">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Put Flow: {putFlow.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {flowPct > 50 ? (
                          <span className="text-red-600 dark:text-red-400">Bearish</span>
                        ) : (
                          <span className="text-green-600 dark:text-green-400">Bullish</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {putFlow.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {flowPct > 50 ? (
                          <span className="text-red-600 dark:text-red-400">High</span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Low</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Net Flow */}
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Net Flow: {netFlow.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {netFlow > 0 ? (
                          <span className="text-green-600 dark:text-green-400">Positive</span>
                        ) : netFlow < 0 ? (
                          <span className="text-red-600 dark:text-red-400">Negative</span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Neutral</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {netFlow.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {netFlow > 0 ? (
                          <span className="text-green-600 dark:text-green-400">Positive</span>
                        ) : netFlow < 0 ? (
                          <span className="text-red-600 dark:text-red-400">Negative</span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Neutral</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="callFlow" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="putFlow" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
