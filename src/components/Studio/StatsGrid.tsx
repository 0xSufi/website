import React from 'react';
import { SimpleGrid } from '@chakra-ui/react';
import { FiBarChart2, FiDollarSign, FiUsers } from 'react-icons/fi';
import StatsCard from './StatsCard';
import { StudioStats } from '../../services/studioService';

interface StatsGridProps {
  stats: StudioStats;
  isLoading: boolean;
}

const StatsGrid: React.FC<StatsGridProps> = ({ stats, isLoading }) => {
  const formatCurrency = (value: number): string => {
    if (value === 0) return '$0';
    if (value < 1000) return `$${value.toFixed(2)}`;
    if (value < 1000000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${(value / 1000000).toFixed(2)}M`;
  };

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
      <StatsCard
        title="Total Tokens"
        value={stats.totalTokens}
        subtitle="Active launches"
        icon={<FiBarChart2 size={20} />}
        isLoading={isLoading}
      />

      <StatsCard
        title="Total Volume"
        value={formatCurrency(stats.totalVolume)}
        subtitle="Last 24 hours"
        icon={<FiDollarSign size={20} />}
        isLoading={isLoading}
        valueColor={stats.totalVolume > 0 ? '#4ade80' : 'white'}
      />

      <StatsCard
        title="Holders"
        value={stats.totalHolders}
        subtitle="Unique addresses"
        icon={<FiUsers size={20} />}
        isLoading={isLoading}
      />

      <StatsCard
        title="Liquidity"
        value={formatCurrency(stats.totalLiquidity)}
        subtitle="Total locked"
        icon={<FiDollarSign size={20} />}
        isLoading={isLoading}
      />
    </SimpleGrid>
  );
};

export default StatsGrid;
