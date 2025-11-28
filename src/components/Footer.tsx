import React from "react";
import { Box, HStack, Text, Link } from '@chakra-ui/react';
import { isMobile } from "react-device-detect";

const Footer: React.FC = () => {
  return (
    <Box
      as="footer"
      bg="#0a0a0a"
      borderTop="1px solid #1a1a1a"
      py={4}
      px={4}
      mt="auto"
    >
      <Box>
        <HStack
          justify="space-between"
          maxW="1200px"
          mx="auto"
          flexDirection={isMobile ? "column" : "row"}
          gap={isMobile ? 4 : 0}
        >
          <Text color="#888" fontSize="sm">
            © 2025/2026 Fundamental Labs. 
          </Text>
          <Box>
            <HStack gap={4}>
              {/* <Link
                href="https://noma.money"
                color="#888"
                fontSize="sm"
                _hover={{ color: "#4ade80" }}
              >
                Website
              </Link>
              <Link
                href="https://docs.noma.money"
                color="#888"
                fontSize="sm"
                _hover={{ color: "#4ade80" }}
              >
                Docs
              </Link> */}
                <Text color="#888" fontSize="sm">
                  Contact: 
                  <Link href="mailto:invest@flabs.cc" style={{ color: "#4ade80", visited: { color: "#4ade80" } }}>
                   &nbsp; invest@flabs.cc
                  </Link> 
                </Text>              
            </HStack>
          </Box>
        </HStack>
      </Box>
    </Box>
  );
};

export default Footer;
