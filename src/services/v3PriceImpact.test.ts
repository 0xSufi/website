import { ethers } from 'ethers';
import { V3PriceImpactCalculator, PositionData } from './v3PriceImpact';

describe('V3PriceImpactCalculator', () => {
  // Test data: simulate a token trading at ~0.004 ETH
  const spotPrice = 0.004; // 0.004 ETH per token
  const currentTick = -92100; // Corresponds roughly to 0.004 price

  // Mock position data for Floor, Anchor, Discovery
  const mockPositions: PositionData[] = [
    {
      name: 'Floor',
      lowerTick: -92200,
      upperTick: -92000,
      amount0: ethers.utils.parseEther('10000'), // 10k tokens
      amount1: ethers.utils.parseEther('40')     // 40 ETH
    },
    {
      name: 'Anchor',
      lowerTick: -92150,
      upperTick: -92050,
      amount0: ethers.utils.parseEther('20000'), // 20k tokens
      amount1: ethers.utils.parseEther('80')     // 80 ETH
    },
    {
      name: 'Discovery',
      lowerTick: -92100,
      upperTick: -91900,
      amount0: ethers.utils.parseEther('5000'),  // 5k tokens
      amount1: ethers.utils.parseEther('20')     // 20 ETH
    }
  ];

  test('Small buy order - low impact', () => {
    const tradeAmount = '0.1'; // 0.1 ETH
    const quoteAmountOut = ethers.utils.parseEther('24.5'); // Get ~24.5 tokens (slightly less than 0.1/0.004 = 25 due to slippage)

    const result = V3PriceImpactCalculator.calculatePriceImpact(
      tradeAmount,
      quoteAmountOut,
      true, // buying
      mockPositions,
      currentTick,
      spotPrice
    );

    // console.log('\n=== Small Buy Order ===');
    // console.log('Input: 0.1 ETH');
    // console.log('Output:', ethers.utils.formatEther(quoteAmountOut), 'tokens');
    // console.log('Price Impact:', result.priceImpact.toFixed(2) + '%');
    // console.log('Execution Price:', result.executionPrice.toFixed(6), 'ETH per token');
    // console.log('Spot Price:', result.midPrice.toFixed(6), 'ETH per token');
    // console.log('Liquidity Depth:', result.liquidityDepth.toFixed(2) + '%');
    // console.log('Positions Crossed:', result.positionsCrossed);
    // console.log('Risk Level:', result.riskLevel);
    // console.log('Warning:', result.warning || 'None');

    expect(result.riskLevel).toBe('low');
    expect(result.priceImpact).toBeLessThan(2);
    expect(result.positionsCrossed).toBeLessThanOrEqual(1);
  });

  test('Medium buy order - moderate impact', () => {
    const tradeAmount = '10'; // 10 ETH
    const quoteAmountOut = ethers.utils.parseEther('2400'); // Get ~2400 tokens (10/0.0042 = ~2380, slight slippage)

    const result = V3PriceImpactCalculator.calculatePriceImpact(
      tradeAmount,
      quoteAmountOut,
      true,
      mockPositions,
      currentTick,
      spotPrice
    );

    // console.log('\n=== Medium Buy Order ===');
    // console.log('Input: 10 ETH');
    // console.log('Output:', ethers.utils.formatEther(quoteAmountOut), 'tokens');
    // console.log('Price Impact:', result.priceImpact.toFixed(2) + '%');
    // console.log('Execution Price:', result.executionPrice.toFixed(6), 'ETH per token');
    // console.log('Liquidity Depth:', result.liquidityDepth.toFixed(2) + '%');
    // console.log('Positions Crossed:', result.positionsCrossed);
    // console.log('Risk Level:', result.riskLevel);
    // console.log('Warning:', result.warning || 'None');
    // console.log('Position Details:', result.positionDetails);

    expect(result.riskLevel).toMatch(/medium|high/);
    expect(result.priceImpact).toBeGreaterThan(2);
  });

  test('Large buy order - high impact', () => {
    const tradeAmount = '50'; // 50 ETH
    const quoteAmountOut = ethers.utils.parseEther('11000'); // Get ~11k tokens (depleting positions)

    const result = V3PriceImpactCalculator.calculatePriceImpact(
      tradeAmount,
      quoteAmountOut,
      true,
      mockPositions,
      currentTick,
      spotPrice
    );

    // console.log('\n=== Large Buy Order ===');
    // console.log('Input: 50 ETH');
    // console.log('Output:', ethers.utils.formatEther(quoteAmountOut), 'tokens');
    // console.log('Price Impact:', result.priceImpact.toFixed(2) + '%');
    // console.log('Execution Price:', result.executionPrice.toFixed(6), 'ETH per token');
    // console.log('Liquidity Depth:', result.liquidityDepth.toFixed(2) + '%');
    // console.log('Positions Crossed:', result.positionsCrossed);
    // console.log('Risk Level:', result.riskLevel);
    // console.log('Warning:', result.warning || 'None');
    // console.log('Position Details:', result.positionDetails);

    expect(result.riskLevel).toMatch(/high|critical/);
    expect(result.priceImpact).toBeGreaterThan(5);
    expect(result.positionsCrossed).toBeGreaterThan(1);
    expect(result.warning).not.toBeNull();
  });

  test('Small sell order - low impact', () => {
    const tradeAmount = '25'; // 25 tokens
    const quoteAmountOut = ethers.utils.parseEther('0.098'); // Get ~0.098 ETH (slightly less than 25*0.004 = 0.1 ETH)

    const result = V3PriceImpactCalculator.calculatePriceImpact(
      tradeAmount,
      quoteAmountOut,
      false, // selling
      mockPositions,
      currentTick,
      spotPrice
    );

    // console.log('\n=== Small Sell Order ===');
    // console.log('Input: 25 tokens');
    // console.log('Output:', ethers.utils.formatEther(quoteAmountOut), 'ETH');
    // console.log('Price Impact:', result.priceImpact.toFixed(2) + '%');
    // console.log('Execution Price:', result.executionPrice.toFixed(6), 'ETH per token');
    // console.log('Liquidity Depth:', result.liquidityDepth.toFixed(2) + '%');
    // console.log('Positions Crossed:', result.positionsCrossed);
    // console.log('Risk Level:', result.riskLevel);
    // console.log('Warning:', result.warning || 'None');

    expect(result.riskLevel).toBe('low');
    expect(result.priceImpact).toBeLessThan(2);
  });

  test('Edge case - zero amounts', () => {
    const result = V3PriceImpactCalculator.calculatePriceImpact(
      '0',
      ethers.utils.parseEther('0'),
      true,
      mockPositions,
      currentTick,
      spotPrice
    );

    // console.log('\n=== Edge Case: Zero Amounts ===');
    // console.log('Result:', result);

    expect(result.priceImpact).toBe(0);
    expect(result.riskLevel).toBe('low');
    expect(result.positionsCrossed).toBe(0);
  });

  test('Edge case - no positions', () => {
    const result = V3PriceImpactCalculator.calculatePriceImpact(
      '1',
      ethers.utils.parseEther('250'),
      true,
      [],
      currentTick,
      spotPrice
    );

    // console.log('\n=== Edge Case: No Positions ===');
    // console.log('Result:', result);

    expect(result.priceImpact).toBe(0);
    expect(result.riskLevel).toBe('low');
  });
});
