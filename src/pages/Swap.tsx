import React, { useState, useRef } from "react";
import {
  Container,
  Box,
  Text,
  HStack,
  VStack,
  Input,
  Button,
  Image,
  Badge,
  NativeSelect,
} from "@chakra-ui/react";
import { isMobile } from "react-device-detect";
import { FaGripVertical, FaExchangeAlt, FaChartLine, FaWallet } from "react-icons/fa";
import { FiX, FiChevronDown, FiSettings, FiRefreshCw } from "react-icons/fi";
import AttractorBackground from "../components/AttractorBackground";

// Mock token data
const TOKENS = [
  { symbol: "ETH", name: "Ethereum", logo: "/assets/images/weth.svg", balance: "1.234", price: 3500 },
  { symbol: "USDC", name: "USD Coin", logo: "/assets/images/usdc.png", balance: "1000.00", price: 1 },
  { symbol: "MON", name: "Monad", logo: "/assets/images/monad.svg", balance: "5000", price: 0.15 },
  { symbol: "WBTC", name: "Wrapped Bitcoin", logo: "/assets/images/Bitcoin.svg", balance: "0.05", price: 95000 },
];

// Draggable hook
const useDraggable = (initialPosition: { x: number; y: number }) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setIsDragging(true);
    dragStart.current = {
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.current.x,
        y: touch.clientY - dragStart.current.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return {
    position,
    isDragging,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseUp,
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
};

// Token Selector Component
interface TokenSelectorProps {
  selectedToken: typeof TOKENS[0];
  onSelect: (token: typeof TOKENS[0]) => void;
  tokens: typeof TOKENS;
  isOpen: boolean;
  onToggle: () => void;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onSelect,
  tokens,
  isOpen,
  onToggle,
}) => {
  return (
    <Box position="relative">
      <HStack
        bg="rgba(26, 26, 26, 0.8)"
        border="1px solid #2a2a2a"
        borderRadius="lg"
        px={3}
        py={2}
        cursor="pointer"
        onClick={onToggle}
        _hover={{ borderColor: "#4ade80" }}
        transition="all 0.2s"
        gap={2}
      >
        <Box w="24px" h="24px" borderRadius="full" bg="#2a2a2a" overflow="hidden">
          <Image src={selectedToken.logo} alt={selectedToken.symbol} w="100%" h="100%" objectFit="cover" fallbackSrc="https://via.placeholder.com/24" />
        </Box>
        <Text color="white" fontWeight="600" fontSize="sm">
          {selectedToken.symbol}
        </Text>
        <FiChevronDown color="#888" />
      </HStack>

      {isOpen && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          mt={1}
          bg="rgba(26, 26, 26, 0.95)"
          border="1px solid #2a2a2a"
          borderRadius="lg"
          p={2}
          zIndex={100}
          minW="200px"
          backdropFilter="blur(8px)"
        >
          <VStack align="stretch" gap={1}>
            {tokens.map((token) => (
              <HStack
                key={token.symbol}
                p={2}
                borderRadius="md"
                cursor="pointer"
                bg={selectedToken.symbol === token.symbol ? "rgba(74, 222, 128, 0.1)" : "transparent"}
                _hover={{ bg: "rgba(74, 222, 128, 0.1)" }}
                onClick={() => {
                  onSelect(token);
                  onToggle();
                }}
              >
                <Box w="28px" h="28px" borderRadius="full" bg="#2a2a2a" overflow="hidden">
                  <Image src={token.logo} alt={token.symbol} w="100%" h="100%" objectFit="cover" fallbackSrc="https://via.placeholder.com/28" />
                </Box>
                <VStack align="start" gap={0} flex={1}>
                  <Text color="white" fontSize="sm" fontWeight="600">
                    {token.symbol}
                  </Text>
                  <Text color="#888" fontSize="xs">
                    {token.name}
                  </Text>
                </VStack>
                <Text color="#4ade80" fontSize="xs">
                  {token.balance}
                </Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
    </Box>
  );
};

// Swap Interface Component
interface SwapInterfaceProps {
  onClose?: () => void;
}

const SwapInterface: React.FC<SwapInterfaceProps> = ({ onClose }) => {
  const [fromToken, setFromToken] = useState(TOKENS[0]);
  const [toToken, setToToken] = useState(TOKENS[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [fromSelectorOpen, setFromSelectorOpen] = useState(false);
  const [toSelectorOpen, setToSelectorOpen] = useState(false);
  const [slippage, setSlippage] = useState("0.5");

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const calculateToAmount = (amount: string) => {
    if (!amount) return "";
    const fromValue = parseFloat(amount) * fromToken.price;
    return (fromValue / toToken.price).toFixed(6);
  };

  return (
    <Box
      bg="rgba(26, 26, 26, 0.7)"
      border="1px solid #2a2a2a"
      borderRadius="xl"
      p={4}
      w={isMobile ? "100%" : "380px"}
      backdropFilter="blur(12px)"
    >
      {/* Header */}
      <HStack justify="space-between" mb={4}>
        <Text color="white" fontSize="lg" fontWeight="600">
          Swap
        </Text>
        <HStack gap={2}>
          <Box
            as="button"
            p={2}
            borderRadius="md"
            color="#888"
            _hover={{ color: "#4ade80", bg: "rgba(74, 222, 128, 0.1)" }}
            transition="all 0.2s"
          >
            <FiRefreshCw size={16} />
          </Box>
          <Box
            as="button"
            p={2}
            borderRadius="md"
            color="#888"
            _hover={{ color: "#4ade80", bg: "rgba(74, 222, 128, 0.1)" }}
            transition="all 0.2s"
          >
            <FiSettings size={16} />
          </Box>
        </HStack>
      </HStack>

      {/* From Token */}
      <Box
        bg="rgba(10, 10, 10, 0.6)"
        border="1px solid #2a2a2a"
        borderRadius="lg"
        p={3}
        mb={2}
      >
        <HStack justify="space-between" mb={2}>
          <Text color="#888" fontSize="xs">You pay</Text>
          <HStack gap={1}>
            <Text color="#888" fontSize="xs">Balance: {fromToken.balance}</Text>
            <Text
              color="#4ade80"
              fontSize="xs"
              cursor="pointer"
              _hover={{ textDecoration: "underline" }}
              onClick={() => setFromAmount(fromToken.balance)}
            >
              MAX
            </Text>
          </HStack>
        </HStack>
        <HStack>
          <Input
            value={fromAmount}
            onChange={(e) => {
              setFromAmount(e.target.value);
              setToAmount(calculateToAmount(e.target.value));
            }}
            placeholder="0.0"
            border="none"
            bg="transparent"
            color="white"
            fontSize="2xl"
            fontWeight="600"
            p={0}
            _focus={{ boxShadow: "none" }}
            _placeholder={{ color: "#555" }}
          />
          <TokenSelector
            selectedToken={fromToken}
            onSelect={setFromToken}
            tokens={TOKENS}
            isOpen={fromSelectorOpen}
            onToggle={() => {
              setFromSelectorOpen(!fromSelectorOpen);
              setToSelectorOpen(false);
            }}
          />
        </HStack>
        <Text color="#888" fontSize="xs" mt={1}>
          ${fromAmount ? (parseFloat(fromAmount) * fromToken.price).toFixed(2) : "0.00"}
        </Text>
      </Box>

      {/* Swap Button */}
      <Box display="flex" justifyContent="center" my={-2} position="relative" zIndex={10}>
        <Box
          as="button"
          bg="#1a1a1a"
          border="2px solid #2a2a2a"
          borderRadius="full"
          p={2}
          cursor="pointer"
          onClick={handleSwapTokens}
          _hover={{ borderColor: "#4ade80", transform: "rotate(180deg)" }}
          transition="all 0.3s"
        >
          <FaExchangeAlt color="#4ade80" style={{ transform: "rotate(90deg)" }} />
        </Box>
      </Box>

      {/* To Token */}
      <Box
        bg="rgba(10, 10, 10, 0.6)"
        border="1px solid #2a2a2a"
        borderRadius="lg"
        p={3}
        mt={2}
      >
        <HStack justify="space-between" mb={2}>
          <Text color="#888" fontSize="xs">You receive</Text>
          <Text color="#888" fontSize="xs">Balance: {toToken.balance}</Text>
        </HStack>
        <HStack>
          <Input
            value={toAmount}
            onChange={(e) => setToAmount(e.target.value)}
            placeholder="0.0"
            border="none"
            bg="transparent"
            color="white"
            fontSize="2xl"
            fontWeight="600"
            p={0}
            _focus={{ boxShadow: "none" }}
            _placeholder={{ color: "#555" }}
            readOnly
          />
          <TokenSelector
            selectedToken={toToken}
            onSelect={setToToken}
            tokens={TOKENS}
            isOpen={toSelectorOpen}
            onToggle={() => {
              setToSelectorOpen(!toSelectorOpen);
              setFromSelectorOpen(false);
            }}
          />
        </HStack>
        <Text color="#888" fontSize="xs" mt={1}>
          ${toAmount ? (parseFloat(toAmount) * toToken.price).toFixed(2) : "0.00"}
        </Text>
      </Box>

      {/* Slippage */}
      <HStack justify="space-between" mt={3} px={1}>
        <Text color="#888" fontSize="xs">Slippage Tolerance</Text>
        <HStack gap={1}>
          {["0.1", "0.5", "1.0"].map((s) => (
            <Box
              key={s}
              as="button"
              px={2}
              py={0.5}
              borderRadius="md"
              bg={slippage === s ? "rgba(74, 222, 128, 0.2)" : "transparent"}
              border="1px solid"
              borderColor={slippage === s ? "#4ade80" : "#2a2a2a"}
              color={slippage === s ? "#4ade80" : "#888"}
              fontSize="xs"
              onClick={() => setSlippage(s)}
              _hover={{ borderColor: "#4ade80" }}
              transition="all 0.2s"
            >
              {s}%
            </Box>
          ))}
        </HStack>
      </HStack>

      {/* Rate Info */}
      {fromAmount && toAmount && (
        <Box
          bg="rgba(10, 10, 10, 0.4)"
          borderRadius="md"
          p={2}
          mt={3}
        >
          <HStack justify="space-between">
            <Text color="#888" fontSize="xs">Rate</Text>
            <Text color="white" fontSize="xs">
              1 {fromToken.symbol} = {(fromToken.price / toToken.price).toFixed(6)} {toToken.symbol}
            </Text>
          </HStack>
          <HStack justify="space-between" mt={1}>
            <Text color="#888" fontSize="xs">Network Fee</Text>
            <Text color="white" fontSize="xs">~$2.50</Text>
          </HStack>
        </Box>
      )}

      {/* Swap Button */}
      <Button
        w="100%"
        mt={4}
        bg="#4ade80"
        color="black"
        fontWeight="600"
        _hover={{ bg: "#22c55e" }}
        _disabled={{ bg: "#2a2a2a", color: "#666", cursor: "not-allowed" }}
        disabled={!fromAmount || parseFloat(fromAmount) <= 0}
      >
        {!fromAmount ? "Enter amount" : "Swap"}
      </Button>
    </Box>
  );
};

// Exchange Interface Component (Full UI)
const ExchangeInterface: React.FC = () => {
  const [fromToken, setFromToken] = useState(TOKENS[0]);
  const [toToken, setToToken] = useState(TOKENS[1]);
  const [orderType, setOrderType] = useState<"market" | "limit">("market");
  const [side, setSide] = useState<"buy" | "sell">("buy");

  return (
    <Box
      bg="rgba(26, 26, 26, 0.7)"
      border="1px solid #2a2a2a"
      borderRadius="xl"
      p={4}
      w={isMobile ? "100%" : "500px"}
      backdropFilter="blur(12px)"
    >
      {/* Header */}
      <HStack justify="space-between" mb={4}>
        <HStack gap={2}>
          <Box w="32px" h="32px" borderRadius="full" bg="#2a2a2a" overflow="hidden">
            <Image src={fromToken.logo} alt={fromToken.symbol} w="100%" h="100%" fallbackSrc="https://via.placeholder.com/32" />
          </Box>
          <VStack align="start" gap={0}>
            <Text color="white" fontSize="md" fontWeight="600">
              {fromToken.symbol}/{toToken.symbol}
            </Text>
            <Text color="#4ade80" fontSize="xs">
              ${fromToken.price.toLocaleString()}
            </Text>
          </VStack>
        </HStack>
        <HStack gap={2}>
          <Badge bg="rgba(74, 222, 128, 0.1)" color="#4ade80" fontSize="xs">
            +2.45%
          </Badge>
        </HStack>
      </HStack>

      {/* Mini Chart Placeholder */}
      <Box
        bg="rgba(10, 10, 10, 0.6)"
        border="1px solid #2a2a2a"
        borderRadius="lg"
        h="120px"
        mb={4}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack>
          <FaChartLine size={24} color="#4ade80" />
          <Text color="#888" fontSize="xs">Price Chart</Text>
        </VStack>
      </Box>

      {/* Order Type Tabs */}
      <HStack mb={4} bg="rgba(10, 10, 10, 0.6)" borderRadius="lg" p={1}>
        <Box
          flex={1}
          py={2}
          textAlign="center"
          borderRadius="md"
          bg={orderType === "market" ? "rgba(74, 222, 128, 0.2)" : "transparent"}
          color={orderType === "market" ? "#4ade80" : "#888"}
          cursor="pointer"
          onClick={() => setOrderType("market")}
          transition="all 0.2s"
        >
          <Text fontSize="sm" fontWeight="600">Market</Text>
        </Box>
        <Box
          flex={1}
          py={2}
          textAlign="center"
          borderRadius="md"
          bg={orderType === "limit" ? "rgba(74, 222, 128, 0.2)" : "transparent"}
          color={orderType === "limit" ? "#4ade80" : "#888"}
          cursor="pointer"
          onClick={() => setOrderType("limit")}
          transition="all 0.2s"
        >
          <Text fontSize="sm" fontWeight="600">Limit</Text>
        </Box>
      </HStack>

      {/* Buy/Sell Tabs */}
      <HStack mb={4} gap={2}>
        <Box
          flex={1}
          py={2}
          textAlign="center"
          borderRadius="lg"
          bg={side === "buy" ? "rgba(74, 222, 128, 0.2)" : "rgba(10, 10, 10, 0.6)"}
          border="1px solid"
          borderColor={side === "buy" ? "#4ade80" : "#2a2a2a"}
          color={side === "buy" ? "#4ade80" : "#888"}
          cursor="pointer"
          onClick={() => setSide("buy")}
          transition="all 0.2s"
        >
          <Text fontSize="sm" fontWeight="600">Buy</Text>
        </Box>
        <Box
          flex={1}
          py={2}
          textAlign="center"
          borderRadius="lg"
          bg={side === "sell" ? "rgba(239, 68, 68, 0.2)" : "rgba(10, 10, 10, 0.6)"}
          border="1px solid"
          borderColor={side === "sell" ? "#ef4444" : "#2a2a2a"}
          color={side === "sell" ? "#ef4444" : "#888"}
          cursor="pointer"
          onClick={() => setSide("sell")}
          transition="all 0.2s"
        >
          <Text fontSize="sm" fontWeight="600">Sell</Text>
        </Box>
      </HStack>

      {/* Price Input (for limit orders) */}
      {orderType === "limit" && (
        <Box
          bg="rgba(10, 10, 10, 0.6)"
          border="1px solid #2a2a2a"
          borderRadius="lg"
          p={3}
          mb={3}
        >
          <Text color="#888" fontSize="xs" mb={2}>Price</Text>
          <HStack>
            <Input
              placeholder="0.0"
              border="none"
              bg="transparent"
              color="white"
              fontSize="lg"
              fontWeight="600"
              p={0}
              _focus={{ boxShadow: "none" }}
              _placeholder={{ color: "#555" }}
            />
            <Text color="#888" fontSize="sm">{toToken.symbol}</Text>
          </HStack>
        </Box>
      )}

      {/* Amount Input */}
      <Box
        bg="rgba(10, 10, 10, 0.6)"
        border="1px solid #2a2a2a"
        borderRadius="lg"
        p={3}
        mb={3}
      >
        <HStack justify="space-between" mb={2}>
          <Text color="#888" fontSize="xs">Amount</Text>
          <Text color="#888" fontSize="xs">Balance: {side === "buy" ? toToken.balance : fromToken.balance}</Text>
        </HStack>
        <HStack>
          <Input
            placeholder="0.0"
            border="none"
            bg="transparent"
            color="white"
            fontSize="lg"
            fontWeight="600"
            p={0}
            _focus={{ boxShadow: "none" }}
            _placeholder={{ color: "#555" }}
          />
          <Text color="#888" fontSize="sm">{side === "buy" ? toToken.symbol : fromToken.symbol}</Text>
        </HStack>
      </Box>

      {/* Percentage Buttons */}
      <HStack mb={4} gap={2}>
        {["25%", "50%", "75%", "100%"].map((pct) => (
          <Box
            key={pct}
            flex={1}
            py={1.5}
            textAlign="center"
            borderRadius="md"
            bg="rgba(10, 10, 10, 0.6)"
            border="1px solid #2a2a2a"
            color="#888"
            fontSize="xs"
            cursor="pointer"
            _hover={{ borderColor: "#4ade80", color: "#4ade80" }}
            transition="all 0.2s"
          >
            {pct}
          </Box>
        ))}
      </HStack>

      {/* Total */}
      <Box
        bg="rgba(10, 10, 10, 0.6)"
        border="1px solid #2a2a2a"
        borderRadius="lg"
        p={3}
        mb={4}
      >
        <HStack justify="space-between">
          <Text color="#888" fontSize="xs">Total</Text>
          <Text color="white" fontSize="sm" fontWeight="600">0.00 {side === "buy" ? fromToken.symbol : toToken.symbol}</Text>
        </HStack>
      </Box>

      {/* Submit Button */}
      <Button
        w="100%"
        bg={side === "buy" ? "#4ade80" : "#ef4444"}
        color={side === "buy" ? "black" : "white"}
        fontWeight="600"
        _hover={{ bg: side === "buy" ? "#22c55e" : "#dc2626" }}
      >
        {side === "buy" ? "Buy" : "Sell"} {fromToken.symbol}
      </Button>
    </Box>
  );
};

// Compact Token Selector Panel
const TokenSelectorPanel: React.FC = () => {
  const [selectedToken, setSelectedToken] = useState(TOKENS[0]);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTokens = TOKENS.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box
      bg="rgba(26, 26, 26, 0.7)"
      border="1px solid #2a2a2a"
      borderRadius="xl"
      p={3}
      w={isMobile ? "100%" : "220px"}
      backdropFilter="blur(12px)"
    >
      <HStack mb={3}>
        <FaWallet color="#4ade80" size={14} />
        <Text color="white" fontSize="sm" fontWeight="600">Tokens</Text>
      </HStack>

      <Input
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        bg="rgba(10, 10, 10, 0.6)"
        border="1px solid #2a2a2a"
        borderRadius="md"
        color="white"
        fontSize="xs"
        mb={2}
        _placeholder={{ color: "#666" }}
        _focus={{ borderColor: "#4ade80" }}
      />

      <VStack align="stretch" gap={1} maxH="200px" overflowY="auto">
        {filteredTokens.map((token) => (
          <HStack
            key={token.symbol}
            p={2}
            borderRadius="md"
            cursor="pointer"
            bg={selectedToken.symbol === token.symbol ? "rgba(74, 222, 128, 0.1)" : "transparent"}
            border="1px solid"
            borderColor={selectedToken.symbol === token.symbol ? "#4ade80" : "transparent"}
            _hover={{ bg: "rgba(74, 222, 128, 0.1)" }}
            onClick={() => setSelectedToken(token)}
            transition="all 0.2s"
          >
            <Box w="20px" h="20px" borderRadius="full" bg="#2a2a2a" overflow="hidden">
              <Image src={token.logo} alt={token.symbol} w="100%" h="100%" fallbackSrc="https://via.placeholder.com/20" />
            </Box>
            <VStack align="start" gap={0} flex={1}>
              <Text color="white" fontSize="xs" fontWeight="600">
                {token.symbol}
              </Text>
            </VStack>
            <Text color="#888" fontSize="2xs">
              {token.balance}
            </Text>
          </HStack>
        ))}
      </VStack>
    </Box>
  );
};

// Main Swap Page
const Swap: React.FC = () => {
  const [viewMode, setViewMode] = useState<"swap" | "exchange">("swap");

  // Draggable positions
  const swapDrag = useDraggable({
    x: isMobile ? 20 : window.innerWidth / 2 - 190,
    y: isMobile ? 100 : window.innerHeight / 2 - 250,
  });
  const tokenDrag = useDraggable({
    x: isMobile ? 20 : 40,
    y: isMobile ? 100 : 100,
  });
  const modeSwitchDrag = useDraggable({
    x: isMobile ? 20 : window.innerWidth - 200,
    y: 100,
  });

  return (
    <Container maxW="100%" px={0} py={0} bg="#0a0a0a" minH="100vh" position="relative" overflow="hidden">
      <AttractorBackground opacity={0.5} interactive={true} />

      {/* Mode Switch Panel */}
      <Box
        position="fixed"
        left={`${modeSwitchDrag.position.x}px`}
        top={`${modeSwitchDrag.position.y}px`}
        zIndex={20}
      >
        {/* Drag Handle */}
        <Box
          bg="rgba(26, 26, 26, 0.8)"
          border="1px solid #2a2a2a"
          borderBottom="none"
          borderTopRadius="lg"
          px={3}
          py={1.5}
          cursor={modeSwitchDrag.isDragging ? "grabbing" : "grab"}
          {...modeSwitchDrag.handlers}
          userSelect="none"
        >
          <HStack gap={2}>
            <FaGripVertical size={10} color="#555" />
            <Text color="#888" fontSize="2xs" fontWeight="600">View Mode</Text>
          </HStack>
        </Box>
        <Box
          bg="rgba(26, 26, 26, 0.8)"
          border="1px solid #2a2a2a"
          borderBottomRadius="lg"
          p={2}
          backdropFilter="blur(12px)"
        >
          <HStack gap={1}>
            <Box
              px={3}
              py={1.5}
              borderRadius="md"
              bg={viewMode === "swap" ? "rgba(74, 222, 128, 0.2)" : "transparent"}
              border="1px solid"
              borderColor={viewMode === "swap" ? "#4ade80" : "#2a2a2a"}
              color={viewMode === "swap" ? "#4ade80" : "#888"}
              fontSize="xs"
              fontWeight="600"
              cursor="pointer"
              onClick={() => setViewMode("swap")}
              _hover={{ borderColor: "#4ade80" }}
              transition="all 0.2s"
            >
              Swap
            </Box>
            <Box
              px={3}
              py={1.5}
              borderRadius="md"
              bg={viewMode === "exchange" ? "rgba(74, 222, 128, 0.2)" : "transparent"}
              border="1px solid"
              borderColor={viewMode === "exchange" ? "#4ade80" : "#2a2a2a"}
              color={viewMode === "exchange" ? "#4ade80" : "#888"}
              fontSize="xs"
              fontWeight="600"
              cursor="pointer"
              onClick={() => setViewMode("exchange")}
              _hover={{ borderColor: "#4ade80" }}
              transition="all 0.2s"
            >
              Exchange
            </Box>
          </HStack>
        </Box>
      </Box>

      {/* Token Selector Panel */}
      <Box
        position="fixed"
        left={`${tokenDrag.position.x}px`}
        top={`${tokenDrag.position.y}px`}
        zIndex={20}
      >
        {/* Drag Handle */}
        <Box
          bg="rgba(26, 26, 26, 0.8)"
          border="1px solid #2a2a2a"
          borderBottom="none"
          borderTopRadius="lg"
          px={3}
          py={1.5}
          cursor={tokenDrag.isDragging ? "grabbing" : "grab"}
          {...tokenDrag.handlers}
          userSelect="none"
        >
          <HStack gap={2}>
            <FaGripVertical size={10} color="#555" />
            <Text color="#888" fontSize="2xs" fontWeight="600">Tokens</Text>
          </HStack>
        </Box>
        <TokenSelectorPanel />
      </Box>

      {/* Main Interface */}
      <Box
        position="fixed"
        left={`${swapDrag.position.x}px`}
        top={`${swapDrag.position.y}px`}
        zIndex={20}
      >
        {/* Drag Handle */}
        <Box
          bg="rgba(26, 26, 26, 0.8)"
          border="1px solid #2a2a2a"
          borderBottom="none"
          borderTopRadius="lg"
          px={3}
          py={1.5}
          cursor={swapDrag.isDragging ? "grabbing" : "grab"}
          {...swapDrag.handlers}
          userSelect="none"
        >
          <HStack gap={2}>
            <FaGripVertical size={10} color="#555" />
            <Text color="#888" fontSize="2xs" fontWeight="600">
              {viewMode === "swap" ? "Swap" : "Exchange"}
            </Text>
          </HStack>
        </Box>
        {viewMode === "swap" ? <SwapInterface /> : <ExchangeInterface />}
      </Box>

      {/* Instructions */}
      <Box position="fixed" bottom={4} left={4} zIndex={10}>
        <Text color="#666" fontSize="xs">
          Drag panels to reposition • Drag background to rotate
        </Text>
      </Box>
    </Container>
  );
};

export default Swap;
