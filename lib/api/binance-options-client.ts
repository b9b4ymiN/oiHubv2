// lib/api/binance-options-client.ts
// DEBT: This class-based file exists alongside binance-options-enhanced.ts (functional) due to
// edge runtime constraints. See ADR follow-up #2 in the consolidation plan.
import {
  OptionContract,
  OptionsChain,
  VolatilitySmile,
  OptionsVolumeByStrike,
  ExpectedMove,
} from "@/types/market";
import { BinanceFetcher } from "./binance-fetcher";
import { parseExpiryTimestamp } from "./binance-options-enhanced";

/**
 * Binance Options API Client (class-based, Node.js runtime only)
 *
 * Uses European Options API (eapi.binance.com)
 * API Documentation: https://developers.binance.com/docs/derivatives/option
 */
export class BinanceOptionsClient {
  private fetcher: BinanceFetcher;

  constructor() {
    this.fetcher = new BinanceFetcher({
      baseUrl:
        process.env.NEXT_PUBLIC_BINANCE_EAPI_URL || "https://eapi.binance.com",
    });
  }

  async fetchPublic(endpoint: string, params: Record<string, any> = {}) {
    return this.fetcher.fetchPublic(endpoint, params);
  }

  /**
   * Get exchange info for options
   */
  async getExchangeInfo() {
    return this.fetchPublic("/eapi/v1/exchangeInfo");
  }

  /**
   * Get underlying asset index price (e.g., BTC, ETH spot price)
   */
  async getIndexPrice(underlying: string = "BTCUSDT") {
    const data = await this.fetchPublic("/eapi/v1/index", { underlying });
    return {
      underlying,
      indexPrice: parseFloat(data.indexPrice),
      timestamp: data.time || Date.now(),
    };
  }

  /**
   * Get mark price for all options or specific symbol
   */
  async getMarkPrice(symbol?: string) {
    const params = symbol ? { symbol } : {};
    return this.fetchPublic("/eapi/v1/mark", params);
  }

  /**
   * Get 24hr ticker for options
   */
  async get24hrTicker(symbol?: string) {
    const params = symbol ? { symbol } : {};
    return this.fetchPublic("/eapi/v1/ticker", params);
  }

  /**
   * Get full options chain for a given underlying and expiry
   */
  async getOptionsChain(
    underlying: string,
    expiryDate: number
  ): Promise<OptionsChain> {
    const allTickers = await this.get24hrTicker();
    const allMarks = await this.getMarkPrice();
    const indexData = await this.getIndexPrice(underlying);

    // Filter options for this underlying and expiry date
    const filteredOptions = allTickers.filter((ticker: any) => {
      const parts = ticker.symbol.split("-");
      if (parts.length !== 4) return false;

      const [asset, expiry, , ,] = parts;

      const baseAsset = underlying.replace("USDT", "");
      if (asset !== baseAsset) return false;

      const expiryTimestamp = parseExpiryTimestamp(expiry);
      const targetDate = new Date(expiryDate).setHours(8, 0, 0, 0);

      return Math.abs(expiryTimestamp - targetDate) < 86400000;
    });

    const calls: OptionContract[] = [];
    const puts: OptionContract[] = [];
    const strikes: number[] = [];

    for (const ticker of filteredOptions) {
      const [, , strikeStr, typeStr] = ticker.symbol.split("-");
      const strike = parseFloat(strikeStr);
      const type = typeStr === "C" ? "CALL" : "PUT";

      if (!strikes.includes(strike)) {
        strikes.push(strike);
      }

      const markData = allMarks.find((m: any) => m.symbol === ticker.symbol);

      const contract: OptionContract = {
        symbol: ticker.symbol,
        underlying,
        strike,
        expiryDate,
        type,

        lastPrice: parseFloat(ticker.lastPrice || "0"),
        markPrice: parseFloat(ticker.markPrice || markData?.markPrice || "0"),
        bidPrice: parseFloat(ticker.bidPrice || "0"),
        askPrice: parseFloat(ticker.askPrice || "0"),

        volume: parseFloat(ticker.volume || "0"),
        openInterest: parseFloat(ticker.openInterest || "0"),

        impliedVolatility: parseFloat(markData?.markIV || "0"),
        delta: parseFloat(markData?.delta || "0"),
        gamma: parseFloat(markData?.gamma || "0"),
        theta: parseFloat(markData?.theta || "0"),
        vega: parseFloat(markData?.vega || "0"),

        timestamp: Date.now(),
      };

      if (type === "CALL") {
        calls.push(contract);
      } else {
        puts.push(contract);
      }
    }

    strikes.sort((a, b) => a - b);
    const spotPrice = indexData.indexPrice;
    const atmStrike = strikes.reduce((prev, curr) =>
      Math.abs(curr - spotPrice) < Math.abs(prev - spotPrice) ? curr : prev
    );

    return {
      underlying,
      spotPrice,
      expiryDate,
      calls,
      puts,
      strikes,
      atmStrike,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate volatility smile from options chain
   */
  calculateVolatilitySmile(chain: OptionsChain): VolatilitySmile {
    const strikes = chain.strikes;
    const callIVs: number[] = [];
    const putIVs: number[] = [];

    for (const strike of strikes) {
      const call = chain.calls.find((c) => c.strike === strike);
      const put = chain.puts.find((p) => p.strike === strike);

      callIVs.push(call?.impliedVolatility || 0);
      putIVs.push(put?.impliedVolatility || 0);
    }

    const atmIndex = strikes.indexOf(chain.atmStrike);
    const atmCallIV = callIVs[atmIndex] || 0;
    const atmPutIV = putIVs[atmIndex] || 0;
    const atmIV = (atmCallIV + atmPutIV) / 2;

    const skew = atmPutIV - atmCallIV;

    let skewDirection: "PUT_SKEW" | "CALL_SKEW" | "NEUTRAL" = "NEUTRAL";
    if (skew > 0.02) skewDirection = "PUT_SKEW";
    else if (skew < -0.02) skewDirection = "CALL_SKEW";

    return {
      underlying: chain.underlying,
      expiryDate: chain.expiryDate,
      strikes,
      callIVs,
      putIVs,
      atmIV,
      atmStrike: chain.atmStrike,
      skew,
      skewDirection,
      timestamp: Date.now(),
    };
  }

  /**
   * Aggregate options volume by strike
   */
  calculateVolumeByStrike(chain: OptionsChain): OptionsVolumeByStrike[] {
    const volumeByStrike: OptionsVolumeByStrike[] = [];

    for (const strike of chain.strikes) {
      const call = chain.calls.find((c) => c.strike === strike);
      const put = chain.puts.find((p) => p.strike === strike);

      const putVolume = put?.volume || 0;
      const callVolume = call?.volume || 0;
      const putOI = put?.openInterest || 0;
      const callOI = call?.openInterest || 0;

      const netVolume = callVolume - putVolume;
      const netOI = callOI - putOI;

      const putCallVolumeRatio = callVolume > 0 ? putVolume / callVolume : 0;
      const putCallOIRatio = callOI > 0 ? putOI / callOI : 0;

      const isSupport = putOI > callOI * 1.5 && strike < chain.spotPrice;
      const isResistance = callOI > putOI * 1.5 && strike > chain.spotPrice;

      volumeByStrike.push({
        strike,
        putVolume,
        callVolume,
        putOI,
        callOI,
        netVolume,
        netOI,
        putCallVolumeRatio,
        putCallOIRatio,
        isSupport,
        isResistance,
      });
    }

    return volumeByStrike;
  }

  /**
   * Calculate expected move based on ATM straddle
   */
  calculateExpectedMove(chain: OptionsChain): ExpectedMove {
    const atmCall = chain.calls.find((c) => c.strike === chain.atmStrike);
    const atmPut = chain.puts.find((p) => p.strike === chain.atmStrike);

    if (!atmCall || !atmPut) {
      throw new Error("ATM options not found");
    }

    const atmCallPrice = atmCall.markPrice;
    const atmPutPrice = atmPut.markPrice;
    const straddlePrice = atmCallPrice + atmPutPrice;

    const now = Date.now();
    const daysToExpiry = (chain.expiryDate - now) / (1000 * 60 * 60 * 24);

    const expectedMovePercent = (straddlePrice / chain.spotPrice) * 100;

    const upperBound = chain.spotPrice + straddlePrice;
    const lowerBound = chain.spotPrice - straddlePrice;

    const atmIV = (atmCall.impliedVolatility + atmPut.impliedVolatility) / 2;
    const ivBasedMove = chain.spotPrice * atmIV * Math.sqrt(daysToExpiry / 365);

    return {
      underlying: chain.underlying,
      spotPrice: chain.spotPrice,
      expiryDate: chain.expiryDate,
      daysToExpiry,
      atmStrike: chain.atmStrike,
      atmCallPrice,
      atmPutPrice,
      straddlePrice,
      expectedMovePercent,
      upperBound,
      lowerBound,
      atmIV,
      ivBasedMove,
      timestamp: Date.now(),
    };
  }

  /**
   * Get Greeks data directly from /eapi/v1/mark
   */
  async getGreeks(symbol: string): Promise<{
    symbol: string;
    markPrice: number;
    markIV: number;
    bidIV: number;
    askIV: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    timestamp: number;
  }> {
    const data = await this.getMarkPrice(symbol);

    const markData = Array.isArray(data)
      ? data.find((d: any) => d.symbol === symbol)
      : data;

    if (!markData) {
      throw new Error(`No mark price data found for symbol: ${symbol}`);
    }

    return {
      symbol: markData.symbol,
      markPrice: parseFloat(markData.markPrice || "0"),
      markIV: parseFloat(markData.markIV || "0"),
      bidIV: parseFloat(markData.bidIV || "0"),
      askIV: parseFloat(markData.askIV || "0"),
      delta: parseFloat(markData.delta || "0"),
      gamma: parseFloat(markData.gamma || "0"),
      theta: parseFloat(markData.theta || "0"),
      vega: parseFloat(markData.vega || "0"),
      timestamp: Date.now(),
    };
  }

  /**
   * Get Greeks for entire options chain (all strikes)
   */
  async getGreeksForChain(
    underlying: string,
    expiryDate: number
  ): Promise<
    {
      symbol: string;
      strike: number;
      type: "CALL" | "PUT";
      delta: number;
      gamma: number;
      theta: number;
      vega: number;
      markIV: number;
    }[]
  > {
    const allMarks = await this.getMarkPrice();

    const baseAsset = underlying.replace("USDT", "");
    const greeksData: any[] = [];

    for (const mark of allMarks) {
      const parts = mark.symbol.split("-");
      if (parts.length !== 4) continue;

      const [asset, expiry, strikeStr, typeStr] = parts;

      if (asset !== baseAsset) continue;

      const expiryTimestamp = parseExpiryTimestamp(expiry);
      const targetDate = new Date(expiryDate).setHours(8, 0, 0, 0);

      if (Math.abs(expiryTimestamp - targetDate) > 86400000) continue;

      greeksData.push({
        symbol: mark.symbol,
        strike: parseFloat(strikeStr),
        type: typeStr === "C" ? "CALL" : "PUT",
        delta: parseFloat(mark.delta || "0"),
        gamma: parseFloat(mark.gamma || "0"),
        theta: parseFloat(mark.theta || "0"),
        vega: parseFloat(mark.vega || "0"),
        markIV: parseFloat(mark.markIV || "0"),
      });
    }

    return greeksData;
  }
}

export const binanceOptionsClient = new BinanceOptionsClient();
