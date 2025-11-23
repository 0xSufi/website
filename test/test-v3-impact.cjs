const { ethers } = require('ethers');

// Simple test implementation (copied from the TypeScript file)
class V3PriceImpactCalculator {
  static calculatePriceImpact(
    tradeAmountIn,
    quoteAmountOut,
    isBuying,
    positions,
    currentTick,
    currentSpotPrice
  ) {
    const { formatEther } = ethers.utils;

    const inputAmount = parseFloat(tradeAmountIn);
    const outputAmount = parseFloat(formatEther(quoteAmountOut));

    if (inputAmount === 0 || outputAmount === 0 || positions.length === 0) {
      return this.getEmptyResult();
    }

    // 1. Calculate execution price
    const executionPrice = isBuying
      ? inputAmount / outputAmount
      : outputAmount / inputAmount;

    // 2. Mid-market price
    const midPrice = currentSpotPrice;

    // 3. Basic price impact
    const basicImpact = Math.abs((executionPrice - midPrice) / midPrice) * 100;

    // 4. Determine relevant positions
    const relevantPositions = positions.filter(pos => {
      if (isBuying) {
        return currentTick <= pos.upperTick;
      } else {
        return currentTick >= pos.lowerTick;
      }
    });

    relevantPositions.sort((a, b) => {
      const aDist = Math.abs(currentTick - (a.lowerTick + a.upperTick) / 2);
      const bDist = Math.abs(currentTick - (b.lowerTick + b.upperTick) / 2);
      return aDist - bDist;
    });

    // 5. Calculate liquidity depth
    const liquidityByPosition = relevantPositions.map(pos => {
      const available = isBuying
        ? parseFloat(formatEther(pos.amount0))
        : parseFloat(formatEther(pos.amount1));

      return {
        name: pos.name,
        available: available,
        tickRange: [pos.lowerTick, pos.upperTick]
      };
    });

    const totalAvailable = liquidityByPosition.reduce((sum, p) => sum + p.available, 0);

    if (totalAvailable === 0) {
      return this.getEmptyResult();
    }

    const liquidityDepth = (outputAmount / totalAvailable) * 100;

    // 6. Calculate position consumption
    let remainingAmount = outputAmount;
    const crossedPositions = [];

    for (const pos of liquidityByPosition) {
      if (remainingAmount <= 0) break;

      if (remainingAmount >= pos.available) {
        crossedPositions.push({
          ...pos,
          consumed: 100,
          amountUsed: pos.available
        });
        remainingAmount -= pos.available;
      } else {
        crossedPositions.push({
          ...pos,
          consumed: (remainingAmount / pos.available) * 100,
          amountUsed: remainingAmount
        });
        remainingAmount = 0;
      }
    }

    // 7. Risk level
    const riskLevel = this.calculateRiskLevel(basicImpact, liquidityDepth, crossedPositions.length);

    // 8. Warning
    const warning = this.generateWarning(basicImpact, liquidityDepth, crossedPositions);

    return {
      priceImpact: basicImpact,
      executionPrice: executionPrice,
      midPrice: midPrice,
      liquidityDepth: liquidityDepth,
      positionsCrossed: crossedPositions.length,
      positionDetails: crossedPositions,
      warning: warning,
      riskLevel: riskLevel
    };
  }

  static calculateRiskLevel(priceImpact, liquidityDepth, positionsCrossed) {
    if (priceImpact >= 10 || liquidityDepth >= 80 || positionsCrossed >= 3) {
      return 'critical';
    }
    if (priceImpact >= 5 || liquidityDepth >= 50 || positionsCrossed >= 2) {
      return 'high';
    }
    if (priceImpact >= 2 || liquidityDepth >= 20) {
      return 'medium';
    }
    return 'low';
  }

  static generateWarning(priceImpact, liquidityDepth, crossedPositions) {
    if (liquidityDepth >= 80) {
      return `Consuming ${liquidityDepth.toFixed(1)}% of available liquidity - extremely high impact!`;
    }
    if (priceImpact >= 10) {
      return `Price impact of ${priceImpact.toFixed(2)}% is very high - consider splitting trade`;
    }
    if (crossedPositions.length >= 3) {
      return 'Trade crosses all liquidity positions - consider splitting into smaller trades';
    }
    if (crossedPositions.length >= 2) {
      const fullyDepleted = crossedPositions.filter(p => p.consumed >= 99);
      if (fullyDepleted.length > 0) {
        return `Depleting ${fullyDepleted.map(p => p.name).join(' and ')} position${fullyDepleted.length > 1 ? 's' : ''}`;
      }
      return `Crossing ${crossedPositions.length} liquidity positions`;
    }
    if (priceImpact >= 5) {
      return `Price impact of ${priceImpact.toFixed(2)}% - consider reducing trade size`;
    }
    if (liquidityDepth >= 50) {
      return `Using ${liquidityDepth.toFixed(1)}% of available liquidity`;
    }
    return null;
  }

  static getEmptyResult() {
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
}

// Test data
const spotPrice = 0.004;
const currentTick = -92100;

const mockPositions = [
  {
    name: 'Floor',
    lowerTick: -92200,
    upperTick: -92000,
    amount0: ethers.utils.parseEther('10000'),
    amount1: ethers.utils.parseEther('40')
  },
  {
    name: 'Anchor',
    lowerTick: -92150,
    upperTick: -92050,
    amount0: ethers.utils.parseEther('20000'),
    amount1: ethers.utils.parseEther('80')
  },
  {
    name: 'Discovery',
    lowerTick: -92100,
    upperTick: -91900,
    amount0: ethers.utils.parseEther('5000'),
    amount1: ethers.utils.parseEther('20')
  }
];

console.log('\n========== V3 PRICE IMPACT CALCULATOR TESTS ==========\n');

// Test 1: Small buy
console.log('=== Test 1: Small Buy (0.1 ETH) ===');
const test1 = V3PriceImpactCalculator.calculatePriceImpact(
  '0.1',
  ethers.utils.parseEther('24.5'),
  true,
  mockPositions,
  currentTick,
  spotPrice
);
console.log('Price Impact:', test1.priceImpact.toFixed(2) + '%');
console.log('Execution Price:', test1.executionPrice.toFixed(6));
console.log('Liquidity Depth:', test1.liquidityDepth.toFixed(2) + '%');
console.log('Positions Crossed:', test1.positionsCrossed);
console.log('Risk Level:', test1.riskLevel);
console.log('Warning:', test1.warning || 'None');
console.log('Position Details:', test1.positionDetails);

// Test 2: Medium buy
console.log('\n=== Test 2: Medium Buy (10 ETH) ===');
const test2 = V3PriceImpactCalculator.calculatePriceImpact(
  '10',
  ethers.utils.parseEther('2400'),
  true,
  mockPositions,
  currentTick,
  spotPrice
);
console.log('Price Impact:', test2.priceImpact.toFixed(2) + '%');
console.log('Execution Price:', test2.executionPrice.toFixed(6));
console.log('Liquidity Depth:', test2.liquidityDepth.toFixed(2) + '%');
console.log('Positions Crossed:', test2.positionsCrossed);
console.log('Risk Level:', test2.riskLevel);
console.log('Warning:', test2.warning || 'None');
console.log('Position Details:', test2.positionDetails);

// Test 3: Large buy
console.log('\n=== Test 3: Large Buy (50 ETH) ===');
const test3 = V3PriceImpactCalculator.calculatePriceImpact(
  '50',
  ethers.utils.parseEther('11000'),
  true,
  mockPositions,
  currentTick,
  spotPrice
);
console.log('Price Impact:', test3.priceImpact.toFixed(2) + '%');
console.log('Execution Price:', test3.executionPrice.toFixed(6));
console.log('Liquidity Depth:', test3.liquidityDepth.toFixed(2) + '%');
console.log('Positions Crossed:', test3.positionsCrossed);
console.log('Risk Level:', test3.riskLevel);
console.log('Warning:', test3.warning || 'None');
console.log('Position Details:', test3.positionDetails);

// Test 4: Small sell
console.log('\n=== Test 4: Small Sell (25 tokens) ===');
const test4 = V3PriceImpactCalculator.calculatePriceImpact(
  '25',
  ethers.utils.parseEther('0.098'),
  false,
  mockPositions,
  currentTick,
  spotPrice
);
console.log('Price Impact:', test4.priceImpact.toFixed(2) + '%');
console.log('Execution Price:', test4.executionPrice.toFixed(6));
console.log('Liquidity Depth:', test4.liquidityDepth.toFixed(2) + '%');
console.log('Positions Crossed:', test4.positionsCrossed);
console.log('Risk Level:', test4.riskLevel);
console.log('Warning:', test4.warning || 'None');

console.log('\n========== TESTS COMPLETE ==========\n');
