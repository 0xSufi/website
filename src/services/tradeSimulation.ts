import { ethers } from 'ethers';

/**
 * Advanced Trade Simulation Service
 *
 * This service provides comprehensive trade simulation capabilities including:
 * - Pool stability analysis
 * - Post-trade state predictions
 * - Risk assessment
 * - Price impact calculations
 * - Liquidity depth analysis
 */

export interface PoolState {
    token0Reserve: ethers.BigNumber;
    token1Reserve: ethers.BigNumber;
    token0: string;
    token1: string;
    sqrtPriceX96?: ethers.BigNumber;
    liquidity?: ethers.BigNumber;
    tick?: number;
}

export interface TradeParams {
    amountIn: ethers.BigNumber;
    isBuying: boolean; // true = buying token0 with token1, false = selling token0 for token1
    slippageTolerance: number; // percentage (e.g., 1 for 1%)
}

export interface SimulationResult {
    // Basic trade info
    amountOut: ethers.BigNumber;
    effectivePrice: number;
    priceImpact: number; // percentage

    // Pre-trade state
    preTradeState: {
        spotPrice: number;
        token0Reserve: ethers.BigNumber;
        token1Reserve: ethers.BigNumber;
        liquidityRatio: number;
        totalLiquidity: ethers.BigNumber;
    };

    // Post-trade state
    postTradeState: {
        spotPrice: number;
        token0Reserve: ethers.BigNumber;
        token1Reserve: ethers.BigNumber;
        liquidityRatio: number;
        priceDeviation: number; // percentage change from pre-trade
        totalLiquidity: ethers.BigNumber;
    };

    // Stability metrics
    stability: {
        isStable: boolean;
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        warnings: string[];
        metrics: {
            liquidityDepth: number; // percentage of pool being consumed
            slippageCurve: number; // rate of price change
            impermanentLossRisk: number; // estimated IL percentage
            recoveryTime: number; // estimated blocks to recover
        };
    };

    // Execution analysis
    execution: {
        recommendedSplit: number; // suggested number of smaller trades
        optimalGasUsage: boolean;
        frontRunRisk: 'low' | 'medium' | 'high';
        mevRisk: 'low' | 'medium' | 'high';
    };
}

export class TradeSimulator {
    private static readonly CRITICAL_LIQUIDITY_THRESHOLD = 0.3; // 30% of pool
    private static readonly HIGH_LIQUIDITY_THRESHOLD = 0.15; // 15% of pool
    private static readonly MEDIUM_LIQUIDITY_THRESHOLD = 0.05; // 5% of pool

    private static readonly CRITICAL_PRICE_IMPACT = 10; // 10%
    private static readonly HIGH_PRICE_IMPACT = 5; // 5%
    private static readonly MEDIUM_PRICE_IMPACT = 2; // 2%

    /**
     * Simulate a trade and analyze its impact on the pool
     */
    static simulateTrade(
        poolState: PoolState,
        tradeParams: TradeParams
    ): SimulationResult {
        // Calculate pre-trade metrics
        const preTradePrice = this.calculateSpotPrice(poolState);
        const preTradeLiquidityRatio = this.calculateLiquidityRatio(poolState);
        const totalLiquidity = this.calculateTotalLiquidity(poolState);

        // Calculate trade output using constant product formula (x * y = k)
        const { amountOut, newReserve0, newReserve1 } = this.calculateSwapOutput(
            poolState,
            tradeParams
        );

        // Calculate post-trade state
        const postTradeState: PoolState = {
            ...poolState,
            token0Reserve: newReserve0,
            token1Reserve: newReserve1
        };

        const postTradePrice = this.calculateSpotPrice(postTradeState);
        const postTradeLiquidityRatio = this.calculateLiquidityRatio(postTradeState);
        const priceDeviation = ((postTradePrice - preTradePrice) / preTradePrice) * 100;

        // Calculate price impact
        const priceImpact = Math.abs(priceDeviation);
        const effectivePrice = parseFloat(ethers.utils.formatEther(tradeParams.amountIn)) /
                              parseFloat(ethers.utils.formatEther(amountOut));

        // Calculate stability metrics
        const liquidityDepth = this.calculateLiquidityDepth(poolState, tradeParams.amountIn, tradeParams.isBuying);
        const slippageCurve = this.calculateSlippageCurve(poolState, tradeParams);
        const impermanentLossRisk = this.estimateImpermanentLoss(priceDeviation);
        const recoveryTime = this.estimateRecoveryTime(liquidityDepth, priceImpact);

        // Assess risk level
        const { riskLevel, warnings } = this.assessRisk(
            liquidityDepth,
            priceImpact,
            slippageCurve,
            postTradeLiquidityRatio
        );

        // Analyze execution strategy
        const recommendedSplit = this.calculateOptimalSplit(liquidityDepth, priceImpact);
        const frontRunRisk = this.assessFrontRunRisk(liquidityDepth, priceImpact);
        const mevRisk = this.assessMEVRisk(amountOut, priceImpact);

        return {
            amountOut,
            effectivePrice,
            priceImpact,

            preTradeState: {
                spotPrice: preTradePrice,
                token0Reserve: poolState.token0Reserve,
                token1Reserve: poolState.token1Reserve,
                liquidityRatio: preTradeLiquidityRatio,
                totalLiquidity
            },

            postTradeState: {
                spotPrice: postTradePrice,
                token0Reserve: newReserve0,
                token1Reserve: newReserve1,
                liquidityRatio: postTradeLiquidityRatio,
                priceDeviation,
                totalLiquidity: this.calculateTotalLiquidity(postTradeState)
            },

            stability: {
                isStable: riskLevel === 'low' || riskLevel === 'medium',
                riskLevel,
                warnings,
                metrics: {
                    liquidityDepth,
                    slippageCurve,
                    impermanentLossRisk,
                    recoveryTime
                }
            },

            execution: {
                recommendedSplit,
                optimalGasUsage: recommendedSplit === 1,
                frontRunRisk,
                mevRisk
            }
        };
    }

    /**
     * Calculate swap output using constant product formula
     */
    private static calculateSwapOutput(
        poolState: PoolState,
        tradeParams: TradeParams
    ): { amountOut: ethers.BigNumber; newReserve0: ethers.BigNumber; newReserve1: ethers.BigNumber } {
        const { token0Reserve, token1Reserve } = poolState;
        const { amountIn, isBuying } = tradeParams;

        // Constant product: x * y = k
        const k = token0Reserve.mul(token1Reserve);

        let amountOut: ethers.BigNumber;
        let newReserve0: ethers.BigNumber;
        let newReserve1: ethers.BigNumber;

        if (isBuying) {
            // Buying token0 with token1
            // Add amountIn to token1 reserve
            newReserve1 = token1Reserve.add(amountIn);
            // Calculate new token0 reserve: k / newReserve1
            newReserve0 = k.div(newReserve1);
            // Amount out is the difference in token0
            amountOut = token0Reserve.sub(newReserve0);
        } else {
            // Selling token0 for token1
            // Add amountIn to token0 reserve
            newReserve0 = token0Reserve.add(amountIn);
            // Calculate new token1 reserve: k / newReserve0
            newReserve1 = k.div(newReserve0);
            // Amount out is the difference in token1
            amountOut = token1Reserve.sub(newReserve1);
        }

        return { amountOut, newReserve0, newReserve1 };
    }

    /**
     * Calculate spot price (token1/token0)
     */
    private static calculateSpotPrice(poolState: PoolState): number {
        const reserve0 = parseFloat(ethers.utils.formatEther(poolState.token0Reserve));
        const reserve1 = parseFloat(ethers.utils.formatEther(poolState.token1Reserve));
        return reserve1 / reserve0;
    }

    /**
     * Calculate liquidity ratio (current liquidity / initial liquidity)
     */
    private static calculateLiquidityRatio(poolState: PoolState): number {
        // This would typically come from vault data
        // For now, return 1 (100%) as we don't have historical data
        return 1.0;
    }

    /**
     * Calculate total liquidity
     */
    private static calculateTotalLiquidity(poolState: PoolState): ethers.BigNumber {
        // Geometric mean of reserves: sqrt(x * y)
        const product = poolState.token0Reserve.mul(poolState.token1Reserve);
        // Simple approximation - in production, use proper sqrt for BigNumber
        return poolState.token0Reserve.add(poolState.token1Reserve).div(2);
    }

    /**
     * Calculate what percentage of the pool liquidity is being consumed
     */
    private static calculateLiquidityDepth(
        poolState: PoolState,
        amountIn: ethers.BigNumber,
        isBuying: boolean
    ): number {
        const relevantReserve = isBuying ? poolState.token1Reserve : poolState.token0Reserve;
        const reserveFloat = parseFloat(ethers.utils.formatEther(relevantReserve));
        const amountFloat = parseFloat(ethers.utils.formatEther(amountIn));

        return (amountFloat / reserveFloat) * 100;
    }

    /**
     * Calculate how quickly price changes with trade size
     */
    private static calculateSlippageCurve(
        poolState: PoolState,
        tradeParams: TradeParams
    ): number {
        // Simulate trade at 50% and 100% size to calculate curve
        const halfParams = { ...tradeParams, amountIn: tradeParams.amountIn.div(2) };

        const fullResult = this.calculateSwapOutput(poolState, tradeParams);
        const halfResult = this.calculateSwapOutput(poolState, halfParams);

        const fullPrice = parseFloat(ethers.utils.formatEther(tradeParams.amountIn)) /
                         parseFloat(ethers.utils.formatEther(fullResult.amountOut));
        const halfPrice = parseFloat(ethers.utils.formatEther(halfParams.amountIn)) /
                         parseFloat(ethers.utils.formatEther(halfResult.amountOut));

        // Return the ratio - higher means steeper curve (worse slippage)
        return fullPrice / halfPrice;
    }

    /**
     * Estimate impermanent loss risk
     */
    private static estimateImpermanentLoss(priceDeviation: number): number {
        // Simplified IL calculation: IL ≈ 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
        const ratio = 1 + (priceDeviation / 100);
        const sqrtRatio = Math.sqrt(ratio);
        const il = (2 * sqrtRatio / (1 + ratio)) - 1;
        return Math.abs(il * 100);
    }

    /**
     * Estimate recovery time in blocks
     */
    private static estimateRecoveryTime(liquidityDepth: number, priceImpact: number): number {
        // Rough estimate: larger impacts take longer to recover
        // Assuming ~12 second blocks and natural trading activity
        const baseRecovery = 50; // blocks
        const impactMultiplier = Math.pow(priceImpact / 5, 1.5);
        const depthMultiplier = liquidityDepth / 10;

        return Math.floor(baseRecovery * (1 + impactMultiplier + depthMultiplier));
    }

    /**
     * Assess overall risk level
     */
    private static assessRisk(
        liquidityDepth: number,
        priceImpact: number,
        slippageCurve: number,
        liquidityRatio: number
    ): { riskLevel: 'low' | 'medium' | 'high' | 'critical'; warnings: string[] } {
        const warnings: string[] = [];
        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

        // Check liquidity depth
        if (liquidityDepth >= this.CRITICAL_LIQUIDITY_THRESHOLD * 100) {
            riskLevel = 'critical';
            warnings.push(`⚠️ CRITICAL: Trade consumes ${liquidityDepth.toFixed(1)}% of pool liquidity`);
            warnings.push('🔴 Pool may become unstable and vulnerable to manipulation');
        } else if (liquidityDepth >= this.HIGH_LIQUIDITY_THRESHOLD * 100) {
            if (riskLevel !== 'critical') riskLevel = 'high';
            warnings.push(`⚠️ High liquidity consumption: ${liquidityDepth.toFixed(1)}% of pool`);
        } else if (liquidityDepth >= this.MEDIUM_LIQUIDITY_THRESHOLD * 100) {
            if (riskLevel === 'low') riskLevel = 'medium';
            warnings.push(`ℹ️ Moderate liquidity impact: ${liquidityDepth.toFixed(1)}% of pool`);
        }

        // Check price impact
        if (priceImpact >= this.CRITICAL_PRICE_IMPACT) {
            riskLevel = 'critical';
            warnings.push(`🔴 CRITICAL: ${priceImpact.toFixed(2)}% price impact will destabilize the pool`);
            warnings.push('⛔ Consider splitting into multiple smaller trades');
        } else if (priceImpact >= this.HIGH_PRICE_IMPACT) {
            if (riskLevel !== 'critical') riskLevel = 'high';
            warnings.push(`⚠️ High price impact: ${priceImpact.toFixed(2)}%`);
            warnings.push('💡 Recommend splitting into 2-3 trades');
        } else if (priceImpact >= this.MEDIUM_PRICE_IMPACT) {
            if (riskLevel === 'low') riskLevel = 'medium';
            warnings.push(`ℹ️ Moderate price impact: ${priceImpact.toFixed(2)}%`);
        }

        // Check slippage curve
        if (slippageCurve > 1.5) {
            if (riskLevel === 'low') riskLevel = 'medium';
            warnings.push('📈 Non-linear slippage detected - price impact accelerates with size');
        }

        // Check liquidity ratio
        if (liquidityRatio < 0.5) {
            if (riskLevel === 'low') riskLevel = 'medium';
            warnings.push('⚠️ Pool liquidity is below healthy levels');
        }

        return { riskLevel, warnings };
    }

    /**
     * Calculate optimal number of trade splits
     */
    private static calculateOptimalSplit(liquidityDepth: number, priceImpact: number): number {
        if (priceImpact < this.MEDIUM_PRICE_IMPACT && liquidityDepth < this.MEDIUM_LIQUIDITY_THRESHOLD * 100) {
            return 1; // Single trade is fine
        }

        if (priceImpact >= this.CRITICAL_PRICE_IMPACT || liquidityDepth >= this.CRITICAL_LIQUIDITY_THRESHOLD * 100) {
            return Math.ceil(priceImpact / this.MEDIUM_PRICE_IMPACT); // Split to keep each under 2%
        }

        if (priceImpact >= this.HIGH_PRICE_IMPACT || liquidityDepth >= this.HIGH_LIQUIDITY_THRESHOLD * 100) {
            return 3; // Split into 3 trades
        }

        return 2; // Split into 2 trades
    }

    /**
     * Assess front-running risk
     */
    private static assessFrontRunRisk(liquidityDepth: number, priceImpact: number): 'low' | 'medium' | 'high' {
        if (priceImpact >= this.HIGH_PRICE_IMPACT || liquidityDepth >= this.HIGH_LIQUIDITY_THRESHOLD * 100) {
            return 'high';
        }
        if (priceImpact >= this.MEDIUM_PRICE_IMPACT || liquidityDepth >= this.MEDIUM_LIQUIDITY_THRESHOLD * 100) {
            return 'medium';
        }
        return 'low';
    }

    /**
     * Assess MEV extraction risk
     */
    private static assessMEVRisk(amountOut: ethers.BigNumber, priceImpact: number): 'low' | 'medium' | 'high' {
        const valueOut = parseFloat(ethers.utils.formatEther(amountOut));

        // High value trades with significant impact are MEV targets
        if (valueOut > 10 && priceImpact >= this.HIGH_PRICE_IMPACT) {
            return 'high';
        }
        if (valueOut > 5 && priceImpact >= this.MEDIUM_PRICE_IMPACT) {
            return 'medium';
        }
        return 'low';
    }

    /**
     * Simulate multiple sequential trades
     */
    static simulateTradeSequence(
        poolState: PoolState,
        trades: TradeParams[]
    ): SimulationResult[] {
        const results: SimulationResult[] = [];
        let currentState = { ...poolState };

        for (const trade of trades) {
            const result = this.simulateTrade(currentState, trade);
            results.push(result);

            // Update state for next trade
            currentState = {
                ...currentState,
                token0Reserve: result.postTradeState.token0Reserve,
                token1Reserve: result.postTradeState.token1Reserve
            };
        }

        return results;
    }
}
