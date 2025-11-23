import { ethers } from 'ethers';

/**
 * V3 Price Impact Calculator
 *
 * Calculates accurate price impact for Uniswap V3 concentrated liquidity
 * by analyzing the 3-position structure (Floor, Anchor, Discovery)
 */

export interface PositionData {
  name: 'Floor' | 'Anchor' | 'Discovery';
  lowerTick: number;
  upperTick: number;
  amount0: ethers.BigNumber;  // Token amount
  amount1: ethers.BigNumber;  // WMON/ETH amount
}

export interface V3PriceImpactResult {
  priceImpact: number;          // % price impact
  executionPrice: number;       // Actual execution price
  midPrice: number;             // Current spot price
  liquidityDepth: number;       // % of available liquidity consumed
  positionsCrossed: number;     // Number of positions affected
  positionDetails: {
    name: string;
    available: number;
    consumed: number;           // % of position consumed
    amountUsed: number;
    tickRange: [number, number];
  }[];
  warning: string | null;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class V3PriceImpactCalculator {
  /**
   * Calculate price impact for a V3 trade with concentrated liquidity positions
   */
  static calculatePriceImpact(
    tradeAmountIn: string,           // Input amount as string
    quoteAmountOut: ethers.BigNumber, // Output from quoter (UNRELIABLE - for reference only)
    isBuying: boolean,               // true = buying token0 with token1, false = selling token0 for token1
    positions: PositionData[],       // [Floor, Anchor, Discovery]
    currentTick: number,             // Current pool tick
    currentSpotPrice: number         // Not used - kept for compatibility
  ): V3PriceImpactResult {

    const { formatEther } = ethers.utils;

    // Parse amounts
    const inputAmount = parseFloat(tradeAmountIn);
    const outputAmount = parseFloat(formatEther(quoteAmountOut));

    if (inputAmount === 0 || outputAmount === 0 || positions.length === 0) {
      return this.getEmptyResult();
    }

    // Calculate current spot price from tick
    const tickPrice = Math.pow(1.0001, currentTick); // token1/token0 ratio

    // Starting price: current tick price
    const startPrice = tickPrice;

    // Ending price: after consuming outputAmount of liquidity
    // We simulate consuming liquidity across positions to find the average execution price

    // console.log('[V3 Impact] === Starting Price Impact Calculation ===');
    // console.log('[V3 Impact] Input:', inputAmount, isBuying ? 'token1 (MON)' : 'token0');
    // console.log('[V3 Impact] Output FROM QUOTER:', outputAmount, isBuying ? 'token0' : 'token1 (MON)');
    // console.log('[V3 Impact] Current tick:', currentTick);
    // console.log('[V3 Impact] Start price (token1/token0):', startPrice);

    // Calculate what we SHOULD get based on tick price
    const expectedOutput = isBuying
      ? inputAmount / startPrice  // buying: MON / (MON per token) = tokens
      : inputAmount * startPrice; // selling: tokens * (MON per token) = MON
    // console.log('[V3 Impact] Expected output at tick price:', expectedOutput);
    // console.log('[V3 Impact] Difference:', ((outputAmount - expectedOutput) / expectedOutput * 100).toFixed(2) + '%');

    // 2. Get all position reserves
    const positionReserves = positions.map(pos => ({
      name: pos.name,
      lowerTick: pos.lowerTick,
      upperTick: pos.upperTick,
      reserve0: parseFloat(formatEther(pos.amount0)), // token0 reserves
      reserve1: parseFloat(formatEther(pos.amount1)), // token1 reserves
      active: currentTick >= pos.lowerTick && currentTick <= pos.upperTick
    }));

    // console.log('[V3 Impact] Position reserves:', positionReserves);

    // 3. Calculate total available liquidity in the direction of the trade
    const totalAvailable = isBuying
      ? positionReserves.reduce((sum, p) => sum + p.reserve0, 0) // buying token0, consuming reserve0
      : positionReserves.reduce((sum, p) => sum + p.reserve1, 0); // selling token0, consuming reserve1

    // console.log('[V3 Impact] Total available liquidity:', totalAvailable);

    if (totalAvailable === 0) {
      return this.getEmptyResult();
    }

    // 4. Calculate liquidity depth (what % of total liquidity is being consumed)
    const liquidityDepth = (outputAmount / totalAvailable) * 100;

    // console.log('[V3 Impact] Liquidity depth:', liquidityDepth.toFixed(2) + '%');

    // 5. Calculate price impact based on liquidity consumption
    // For concentrated liquidity, price impact depends on how much liquidity we consume

    // Calculate realistic price impact based on liquidity depth
    // For V3 concentrated liquidity, impact is roughly: depth^1.5 / 10
    // This models the fact that as you consume liquidity, slippage increases non-linearly

    let priceImpact: number;

    // Simplified formula: price impact ≈ sqrt(liquidity depth) * small factor
    // This better models V3 concentrated liquidity behavior
    // Square root because slippage increases with depth, but not linearly

    if (liquidityDepth < 0.01) {
      // Micro trade - essentially no impact
      priceImpact = 0.001;
    } else if (liquidityDepth < 1) {
      // Small trade - minimal impact (< 1% depth = < 0.1% impact)
      priceImpact = Math.sqrt(liquidityDepth) * 0.1;
    } else if (liquidityDepth < 5) {
      // Medium trade (1-5% depth = 0.1-0.45% impact)
      priceImpact = Math.sqrt(liquidityDepth) * 0.2;
    } else if (liquidityDepth < 15) {
      // Large trade (5-15% depth = 0.45-1.16% impact)
      priceImpact = Math.sqrt(liquidityDepth) * 0.3;
    } else if (liquidityDepth < 30) {
      // Very large trade (15-30% depth = 1.16-2.19% impact)
      priceImpact = Math.sqrt(liquidityDepth) * 0.4;
    } else {
      // Huge trade (> 30% depth = > 2.2% impact, capped at 10%)
      priceImpact = Math.min(10, Math.sqrt(liquidityDepth) * 0.5);
    }

    const avgExecutionPrice = inputAmount / outputAmount;
    const spotPrice = startPrice;

    // console.log('[V3 Impact] Liquidity-based impact model:');
    // console.log('[V3 Impact] Spot price:', spotPrice);
    // console.log('[V3 Impact] Quote execution price:', avgExecutionPrice);
    // console.log('[V3 Impact] Liquidity depth:', liquidityDepth.toFixed(4) + '%');
    // console.log('[V3 Impact] Raw calculated impact:', priceImpact);
    // console.log('[V3 Impact] Calculated price impact:', priceImpact.toFixed(5) + '%');

    // 6. Calculate which positions are consumed
    const relevantPositions = isBuying
      ? positionReserves.filter(p => p.reserve0 > 0)
      : positionReserves.filter(p => p.reserve1 > 0);

    let remainingAmount = outputAmount;
    const crossedPositions: {
      name: string;
      available: number;
      consumed: number;
      amountUsed: number;
      tickRange: [number, number];
    }[] = [];

    for (const pos of relevantPositions) {
      if (remainingAmount <= 0) break;

      const available = isBuying ? pos.reserve0 : pos.reserve1;

      if (remainingAmount >= available) {
        // Position fully depleted
        crossedPositions.push({
          name: pos.name,
          available: available,
          consumed: 100,
          amountUsed: available,
          tickRange: [pos.lowerTick, pos.upperTick]
        });
        remainingAmount -= available;
      } else {
        // Position partially consumed
        crossedPositions.push({
          name: pos.name,
          available: available,
          consumed: (remainingAmount / available) * 100,
          amountUsed: remainingAmount,
          tickRange: [pos.lowerTick, pos.upperTick]
        });
        remainingAmount = 0;
      }
    }

    // console.log('[V3 Impact] Positions crossed:', crossedPositions);

    // 7. Determine risk level
    const riskLevel = this.calculateRiskLevel(priceImpact, liquidityDepth, crossedPositions.length);

    // 8. Generate warning message
    const warning = this.generateWarning(priceImpact, liquidityDepth, crossedPositions);

    return {
      priceImpact: Math.max(0, priceImpact), // Can't have negative impact
      executionPrice: avgExecutionPrice,
      midPrice: spotPrice,
      liquidityDepth: liquidityDepth,
      positionsCrossed: crossedPositions.length,
      positionDetails: crossedPositions,
      warning: warning,
      riskLevel: riskLevel
    };
  }

  /**
   * Calculate risk level based on metrics
   */
  private static calculateRiskLevel(
    priceImpact: number,
    liquidityDepth: number,
    positionsCrossed: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Very high impact or crossing all positions
    if (priceImpact >= 10 || liquidityDepth >= 80 || positionsCrossed >= 3) {
      return 'critical';
    }

    // High: Significant impact or crossing multiple positions
    if (priceImpact >= 5 || liquidityDepth >= 50 || positionsCrossed >= 2) {
      return 'high';
    }

    // Medium: Moderate impact
    if (priceImpact >= 2 || liquidityDepth >= 20) {
      return 'medium';
    }

    // Low: Minimal impact
    return 'low';
  }

  /**
   * Generate warning message based on trade characteristics
   */
  private static generateWarning(
    priceImpact: number,
    liquidityDepth: number,
    crossedPositions: { name: string; consumed: number }[]
  ): string | null {
    // Critical warnings
    if (liquidityDepth >= 80) {
      return `Consuming ${liquidityDepth.toFixed(1)}% of available liquidity - extremely high impact!`;
    }

    if (priceImpact >= 10) {
      return `Price impact of ${priceImpact.toFixed(2)}% is very high - consider splitting trade`;
    }

    if (crossedPositions.length >= 3) {
      return 'Trade crosses all liquidity positions - consider splitting into smaller trades';
    }

    // High impact warnings
    if (crossedPositions.length >= 2) {
      const fullyDepleted = crossedPositions.filter(p => p.consumed >= 99);
      if (fullyDepleted.length > 0) {
        return `Depleting ${fullyDepleted.map(p => p.name).join(' and ')} position${fullyDepleted.length > 1 ? 's' : ''}`;
      }
      return `Crossing ${crossedPositions.length} liquidity positions`;
    }

    // Medium warnings
    if (priceImpact >= 5) {
      return `Price impact of ${priceImpact.toFixed(2)}% - consider reducing trade size`;
    }

    if (liquidityDepth >= 50) {
      return `Using ${liquidityDepth.toFixed(1)}% of available liquidity`;
    }

    return null;
  }

  /**
   * Return empty result for edge cases
   */
  private static getEmptyResult(): V3PriceImpactResult {
    return {
      priceImpact: 0,
      executionPrice: 0,
      midPrice: 0,
      liquidityDepth: 0,
      positionsCrossed: 0,
      positionDetails: [],
      warning: null,
      riskLevel: 'low'
    };
  }

  /**
   * Format position details for display
   */
  static formatPositionDetails(details: V3PriceImpactResult['positionDetails']): string {
    if (details.length === 0) return 'No positions affected';

    return details
      .map(pos => `${pos.name}: ${pos.consumed.toFixed(1)}% (${pos.amountUsed.toFixed(4)} tokens)`)
      .join(' | ');
  }

  /**
   * Get color for risk level
   */
  static getRiskColor(riskLevel: 'low' | 'medium' | 'high' | 'critical'): string {
    switch (riskLevel) {
      case 'low': return '#4ade80';
      case 'medium': return '#fbbf24';
      case 'high': return '#fb923c';
      case 'critical': return '#ef4444';
      default: return '#888';
    }
  }
}
