import React from "react";
import { Box, HStack, Text, Link, VStack } from '@chakra-ui/react';
import { isMobile } from "react-device-detect";
import { FiPhone, FiMail } from "react-icons/fi";

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
            © 2025/2026 Fundamental Labs. Apt. 1002, Torre Downtown, Av. Abraham Lincon 165, Santo Domingo 
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
              <VStack>
              <Box>
                <HStack gap={2}>
                  <Box>
                  <FiMail color="#4ade80" />
                  </Box>
                  <Box>
                  <Text color="#888" fontSize="sm">
                    <Link href="mailto:invest@flabs.cc" style={{ color: "#4ade80" }}>
                      invest@flabs.cc
                    </Link>
                  </Text>                    
                  </Box>
                </HStack>
              </Box>
              <Box>
                <HStack gap={2}>
                  <Box><FiPhone color="#888" /></Box>
                  <Box>
                  <Text color="#888" fontSize="sm">
                    +18295271337
                  </Text>                    
                  </Box>
                </HStack>
              </Box>
              </VStack>         
            </HStack>
          </Box>
        </HStack>
      </Box>
    </Box>
  );
};

export default Footer;
