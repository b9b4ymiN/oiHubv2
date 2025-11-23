"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface OptionsVolumeData {
  strike: number;
  callVolume: number;
  putVolume: number;
  totalVolume: number;
  callOI?: number;
  putOI?: number;
}

interface OptionsVolumeBarChartProps {
  data: OptionsVolumeData[];
  height?: number;
  currentPrice?: number;
}

export function OptionsVolumeBarChart({ data, height = 400, currentPrice }: OptionsVolumeBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="strike" tickFormatter={(value) => `$${value.toLocaleString()}`} tick={{ fontSize: 10 }} />
        <YAxis tickFormatter={(value) => value.toLocaleString()} tick={{ fontSize: 10 }} />
        <Tooltip
          content={({ payload, active }) => {
            if (active && payload && payload.length > 0) {
              const data = payload[0].payload;
              const { strike, callVolume, putVolume, totalVolume, callOI, putOI } = data;
              const callPct = totalVolume > 0 ? ((callVolume / totalVolume) * 100).toFixed(1) : "0";
              const putPct = totalVolume > 0 ? ((putVolume / totalVolume) * 100).toFixed(1) : "0";
              
              return (
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Strike and Current Price */}
                    <div className="text-left">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Strike: ${strike.toLocaleString()}
                      </div>
                      {currentPrice && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Current: ${currentPrice.toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Call Volume */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        Call Volume: {callVolume.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {callPct}%
                      </div>
                      {callOI && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          OI: {callOI.toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Put Volume */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        Put Volume: {putVolume.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {putPct}%
                      </div>
                      {putOI && (
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          OI: {putOI.toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Total Volume */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                        Total Volume: {totalVolume.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        100%
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar dataKey="callVolume" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="putVolume" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
