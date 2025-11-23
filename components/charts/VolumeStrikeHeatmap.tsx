"use client";

interface VolumeStrikeData {
  strike: number;
  callVolume: number;
  putVolume: number;
  totalVolume: number;
}

interface VolumeStrikeHeatmapProps {
  data: VolumeStrikeData[];
  height?: number;
}

export function VolumeStrikeHeatmap({ data, height = 400 }: VolumeStrikeHeatmapProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-gray-500 dark:text-gray-400">No volume data available</p>
      </div>
    );
  }

  // Calculate max volume for color intensity
  const maxVolume = Math.max(...data.map(d => d.totalVolume));

  const getHeatmapColor = (volume: number) => {
    const intensity = volume / maxVolume;
    if (intensity > 0.8) return 'bg-red-500';
    if (intensity > 0.6) return 'bg-orange-500';
    if (intensity > 0.4) return 'bg-yellow-500';
    if (intensity > 0.2) return 'bg-green-500';
    return 'bg-blue-500';
  };

  return (
    <div className="w-full" style={{ height }}>
      <div className="grid grid-cols-8 gap-1 h-full p-2">
        {data.map((item, index) => (
          <div
            key={index}
            className={`rounded ${getHeatmapColor(item.totalVolume)} hover:opacity-80 transition-opacity cursor-pointer`}
            title={`Strike: $${item.strike.toLocaleString()}\nCall: ${item.callVolume.toLocaleString()}\nPut: ${item.putVolume.toLocaleString()}\nTotal: ${item.totalVolume.toLocaleString()}`}
          >
            <div className="text-xs text-white text-center p-1">
              ${item.strike.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
