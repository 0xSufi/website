import React, { useState } from "react";
import { Box, HStack, VStack, Text } from '@chakra-ui/react';
import Logo from "../assets/images/dark.png";
import { isMobile } from 'react-device-detect';
import { Link, Image } from '@chakra-ui/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaGripVertical } from 'react-icons/fa';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Draggable navigator state
  const [navPosition, setNavPosition] = useState({ x: 16, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - navPosition.x,
      y: e.clientY - navPosition.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setNavPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - navPosition.x,
      y: touch.clientY - navPosition.y
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      e.preventDefault();
      const touch = e.touches[0];
      setNavPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const navigationItems = [
    { label: 'Splash', value: '/splash' },
    { label: 'Portfolio', value: '/portfolio' },
    { label: 'Team', value: '/team' },
  ];

  return (
    <>
      {/* Fixed header bar */}
      <Box
        as="header"
        id="header"
        position="fixed"
        top={0}
        left={0}
        right={0}
        bg="#0a0a0a"
        borderBottom="1px solid #1a1a1a"
        zIndex={1000}
        px={4}
        py={3}
        w="100%"
      >
        <Box>
          <HStack justify="space-between" w="100%">
            {/* Logo */}
            <Link href="https://noma.money">
              <Image
                src={Logo}
                alt="Noma Protocol"
                w={isMobile ? "40px" : "60px"}
                h={isMobile ? "40px" : "40px"}
              />
            </Link>
          </HStack>
        </Box>
      </Box>

      {/* Draggable Navigation */}
      <Box
        position="fixed"
        left={`${navPosition.x}px`}
        top={`${navPosition.y}px`}
        zIndex={1001}
        cursor={isDragging ? 'grabbing' : 'grab'}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        userSelect="none"
        style={{ touchAction: 'none' }}
      >
        <Box>
          <VStack
            gap={1}
            bg="#1a1a1a"
            border="1px solid #2a2a2a"
            borderRadius="md"
            p={2}
            boxShadow="0 4px 12px rgba(0, 0, 0, 0.5)"
            align="stretch"
          >
            {/* Header with drag handle */}
            <Box>
              <HStack gap={2} justify="center" pb={1} borderBottom="1px solid #2a2a2a">
                <Box><FaGripVertical size={10} color="#555" /></Box>
                <Box><Text color="#888" fontSize="2xs" fontWeight="600">Navigate</Text></Box>
              </HStack>
            </Box>

            {/* Navigation items */}
            <Box>
              <VStack gap={1} align="stretch">
                {navigationItems.map((item) => (
                  <Box
                    key={item.value}
                    as="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(item.value);
                    }}
                    px={3}
                    py={1}
                    borderRadius="sm"
                    fontSize="xs"
                    fontWeight="500"
                    bg={location.pathname === item.value ? '#4ade80' : 'transparent'}
                    color={location.pathname === item.value ? 'black' : '#888'}
                    cursor="pointer"
                    transition="all 0.2s"
                    _hover={{
                      bg: location.pathname === item.value ? '#22c55e' : '#2a2a2a',
                      color: location.pathname === item.value ? 'black' : 'white'
                    }}
                    textAlign="left"
                  >
                    {item.label}
                  </Box>
                ))}
              </VStack>
            </Box>
          </VStack>
        </Box>
      </Box>
    </>
  );
};

export default Header;
