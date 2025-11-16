// app/api/heatmap/oi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { binanceClient } from "@/lib/api/binance-client";
import { buildOIHeatmap } from "@/lib/services/heatmap-builder";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "BTCUSDT";
  const interval = searchParams.get("interval") || "5m";
  const limit = parseInt(searchParams.get("limit") || "200"); // Reduced from 288 to 200
  const priceStep = parseInt(searchParams.get("priceStep") || "15"); // Increased from 10 to 15 for fewer buckets

  try {
    // Fetch OI and price data
    const [oiData, priceData] = await Promise.all([
      binanceClient.getOpenInterestHistory(symbol, interval, limit),
      binanceClient.getKlines(symbol, interval, limit),
    ]);

    // Build heatmap
    const heatmap = buildOIHeatmap(oiData, priceData, {
      priceStep,
      timeStep: getTimeStepMs(interval),
      normalize: true,
    });

    // Optimize: only keep last 100 time buckets if we have more
    const maxTimeBuckets = 100;
    const timeStartIdx = heatmap.timeBuckets.length > maxTimeBuckets 
      ? heatmap.timeBuckets.length - maxTimeBuckets 
      : 0;
    
    const optimizedTimeBuckets = heatmap.timeBuckets.slice(timeStartIdx);
    
    // Slice cells to match time buckets - keep the structure but mark empty cells
    const slicedCells = heatmap.cells.map(row => {
      return row.slice(timeStartIdx).map(cell => {
        // If cell is empty (timestamp === 0), return a minimal empty cell object
        if (cell.timestamp === 0) {
          return { price: 0, timestamp: 0, oiDelta: 0, intensity: 0 };
        }
        return cell;
      });
    });

    // Filter out rows that have no valid data (all cells are empty)
    const filteredData: Array<{row: any[], priceIdx: number}> = [];
    slicedCells.forEach((row, idx) => {
      const hasData = row.some(cell => cell.timestamp !== 0 && cell.oiDelta && Math.abs(cell.oiDelta) > 0);
      if (hasData) {
        filteredData.push({ row, priceIdx: idx });
      }
    });

    const optimizedCells = filteredData.map(item => item.row);
    const optimizedPriceBuckets = filteredData.map(item => heatmap.priceBuckets[item.priceIdx]);

    const optimizedHeatmap = {
      cells: optimizedCells,
      priceBuckets: optimizedPriceBuckets,
      timeBuckets: optimizedTimeBuckets,
      minPrice: heatmap.minPrice,
      maxPrice: heatmap.maxPrice,
      bucketSize: heatmap.bucketSize
    };

    // Debug log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[OI Heatmap] Optimized response:', {
        cellRows: optimizedCells.length,
        cellsPerRow: optimizedCells[0]?.length || 0,
        priceBuckets: optimizedPriceBuckets.length,
        timeBuckets: optimizedTimeBuckets.length,
        sampleCell: optimizedCells[0]?.[0]
      });
    }

    return NextResponse.json({
      success: true,
      data: optimizedHeatmap,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("API route error [/api/heatmap/oi]:", {
      error: error.message,
      stack: error.stack,
      params: { symbol, interval, limit, priceStep },
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details:
          process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

function getTimeStepMs(interval: string): number {
  const map: Record<string, number> = {
    "1m": 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "4h": 4 * 60 * 60 * 1000,
  };
  return map[interval] || 5 * 60 * 1000;
}
