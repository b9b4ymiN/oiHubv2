"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OptionsVolumeData {
  strike: number;
  callVolume: number;
  putVolume: number;
  totalVolume: number;
  callOI?: number;
  putOI?: number;
  callAsk?: number;
  putBid?: number;
}

interface OptionsVolumeTableProps {
  data: OptionsVolumeData[];
  maxHeight?: number;
}

export function OptionsVolumeTable({ data, maxHeight = 400 }: OptionsVolumeTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No volume data available</p>
      </div>
    );
  }

  const getCallPutRatio = (callVol: number, putVol: number) => {
    if (putVol === 0) return '∞';
    return (callVol / putVol).toFixed(2);
  };

  const getTotalOI = (callOI?: number, putOI?: number) => {
    return (callOI || 0) + (putOI || 0);
  };

  return (
    <div className="overflow-auto" style={{ maxHeight }}>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-900 dark:text-gray-100">Strike</th>
            <th className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">Call Vol</th>
            <th className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">Put Vol</th>
            <th className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">Total Vol</th>
            <th className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">C/P Ratio</th>
            <th className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">Call OI</th>
            <th className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">Put OI</th>
            <th className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">Total OI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {data.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                ${item.strike.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                {item.callVolume.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                {item.putVolume.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                {item.totalVolume.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right">
                <span className={`font-medium ${
                  parseFloat(getCallPutRatio(item.callVolume, item.putVolume)) > 1.2 
                    ? 'text-green-600 dark:text-green-400' 
                    : parseFloat(getCallPutRatio(item.callVolume, item.putVolume)) < 0.8 
                    ? 'text-red-600 dark:text-red-400' 
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}>
                  {getCallPutRatio(item.callVolume, item.putVolume)}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                {item.callOI?.toLocaleString() || '0'}
              </td>
              <td className="px-4 py-3 text-right text-red-600 dark:text-red-400">
                {item.putOI?.toLocaleString() || '0'}
              </td>
              <td className="px-4 py-3 text-right text-gray-900 dark:text-gray-100">
                {getTotalOI(item.callOI, item.putOI).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
