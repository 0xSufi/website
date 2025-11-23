import React from 'react';
import { Box, VStack, HStack, Text, Badge, Button, Spinner } from '@chakra-ui/react';
import { TokenData } from '../../services/studioService';

interface TokenListProps {
  tokens: TokenData[];
  isLoading: boolean;
  onTokenSelect?: (token: TokenData) => void;
  selectedTokenId?: number;
}

const TokenList: React.FC<TokenListProps> = ({
  tokens,
  isLoading,
  onTokenSelect,
  selectedTokenId,
}) => {
  if (isLoading) {
    return (
      <Box textAlign="center" py={8}>
        <Spinner color="#4ade80" size="lg" mb={3} />
        <Text color="#888" fontSize="sm">Loading your tokens...</Text>
      </Box>
    );
  }

  if (tokens.length === 0) {
    return (
      <Box
        bg="#0a0a0a"
        border="1px solid #2a2a2a"
        borderRadius="lg"
        p={6}
        textAlign="center"
      >
        <Text fontSize="3xl" mb={2}>🚀</Text>
        <Text color="white" fontSize="sm" fontWeight="600" mb={2}>
          No Tokens Yet
        </Text>
        <Text color="#888" fontSize="xs" mb={4}>
          Launch your first token to get started
        </Text>
        <Button
          variant="solid"
          colorScheme="green"
          size="sm"
          onClick={() => window.location.href = '/launchpad'}
        >
          Launch Token
        </Button>
      </Box>
    );
  }

  return (
    <VStack align="stretch" gap={2}>
      {tokens.map((token) => (
        <Box
          key={token.id}
          bg={selectedTokenId === token.id ? '#252525' : '#0a0a0a'}
          border={selectedTokenId === token.id ? '1px solid #4ade80' : '1px solid #2a2a2a'}
          borderRadius="lg"
          p={3}
          cursor="pointer"
          onClick={() => onTokenSelect?.(token)}
          _hover={{ bg: '#252525', borderColor: '#4ade80' }}
          transition="all 0.2s"
        >
          <HStack justify="space-between" mb={2}>
            <VStack align="start" gap={0}>
              <Text fontSize="sm" fontWeight="600" color="white">
                {token.name}
              </Text>
              <Text fontSize="xs" color="#888">
                ${token.symbol}
              </Text>
            </VStack>
            <Badge
              colorScheme={token.status === 'active' ? 'green' : 'gray'}
              fontSize="xs"
            >
              {token.status}
            </Badge>
          </HStack>

          <HStack gap={4}>
            <VStack align="start" gap={0}>
              <Text fontSize="2xs" color="#888">Price</Text>
              <Text fontSize="xs" color="#4ade80">
                ${token.priceUSD > 0 ? token.priceUSD.toFixed(6) : '0.00'}
              </Text>
            </VStack>
            <VStack align="start" gap={0}>
              <Text fontSize="2xs" color="#888">24h</Text>
              <Text
                fontSize="xs"
                color={token.change24h > 0 ? '#4ade80' : token.change24h < 0 ? '#ef4444' : '#888'}
              >
                {token.change24h > 0 ? '+' : ''}{token.change24h.toFixed(2)}%
              </Text>
            </VStack>
            <VStack align="start" gap={0}>
              <Text fontSize="2xs" color="#888">Volume</Text>
              <Text fontSize="xs" color="white">
                ${token.volume24h > 0 ? token.volume24h.toFixed(0) : '0'}
              </Text>
            </VStack>
          </HStack>
        </Box>
      ))}

      <Button
        variant="outline"
        size="sm"
        colorScheme="green"
        w="100%"
        mt={2}
        onClick={() => window.location.href = '/launchpad'}
      >
        + Launch New Token
      </Button>
    </VStack>
  );
};

export default TokenList;
