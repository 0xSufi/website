import React from 'react';
import { Box, HStack, Text, Spinner } from '@chakra-ui/react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
  valueColor?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  isLoading = false,
  valueColor = 'white',
}) => {
  return (
    <Box
      bg="#1a1a1a"
      border="1px solid #2a2a2a"
      borderRadius="lg"
      p={4}
      transition="all 0.2s"
      _hover={{
        borderColor: '#4ade80',
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(74, 222, 128, 0.1)',
      }}
    >
      <HStack justify="space-between" mb={2}>
        <Text fontSize="sm" color="#888" fontWeight="500">
          {title}
        </Text>
        {icon && (
          <Box color="#4ade80">
            {icon}
          </Box>
        )}
      </HStack>

      {isLoading ? (
        <Box py={2}>
          <Spinner size="md" color="#4ade80" />
        </Box>
      ) : (
        <>
          <Text fontSize="3xl" fontWeight="bold" color={valueColor}>
            {value}
          </Text>
          {subtitle && (
            <Text fontSize="xs" color="#888" mt={1}>
              {subtitle}
            </Text>
          )}
        </>
      )}
    </Box>
  );
};

export default StatsCard;
