import React from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Image,
  Stack,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";
import ArtImage from "../assets/images/features_3.svg";
import useAnalyticsEventTracker from "../hooks/useAnalyticsEventTracker";

const Hero: React.FC = () => {
  const gaEventTracker = useAnalyticsEventTracker("Hero CTA");
  const showIllustration = useBreakpointValue({ base: false, lg: true });

  return (
    <Box
      position="relative"
      overflow="hidden"
      borderRadius="3xl"
      border="1px solid"
      borderColor="border.muted"
      bg="linear-gradient(145deg, rgba(26,26,32,0.92) 0%, rgba(9,9,12,0.92) 100%)"
      px={{ base: 6, md: 12, lg: 16 }}
      py={{ base: 14, md: 20, lg: 24 }}
      boxShadow="surface"
    >
      <Box
        position="absolute"
        inset={0}
        bg="radial-gradient(80% 80% at 0% 0%, rgba(74, 222, 128, 0.12), transparent)"
        opacity={0.85}
      />
      <Box position="relative">
        <Flex
          direction={{ base: "column", lg: "row" }}
          align={{ base: "flex-start", lg: "center" }}
          gap={{ base: 12, lg: 16 }}
        >
          <Box flex="1" maxW={{ base: "full", lg: "640px" }}>
            <Stack spacing={{ base: 6, md: 8 }}>
              <Box>
                <Heading
                  size="2xl"
                  fontWeight={700}
                  lineHeight={1.1}
                  letterSpacing="-0.04em"
                >
                  <Box as="span" color="white">
                    Launch, trade, and scale
                  </Box>{" "}
                  <Box as="span" color="accent.500">
                    unruggable tokens
                  </Box>{" "}
                  <Box as="span" color="white">
                    on Binance Smart Chain.
                  </Box>
                </Heading>
              </Box>
              <Box>
                <Text
                  color="text.subtle"
                  fontSize={{ base: "md", md: "lg" }}
                  maxW="520px"
                >
                  Noma unifies a capital-efficient launchpad, deep liquidity pools,
                  and adaptive staking. Deploy with confidence, monitor vaults in
                  real time, and grow your community without leaving the app.
                </Text>
              </Box>
              <Box>
                <Stack
                  direction={{ base: "column", sm: "row" }}
                  spacing={{ base: 3, sm: 4 }}
                >
                  <Box>
                    <Button
                      size="lg"
                      onClick={() => gaEventTracker("read_announcement")}
                      as="a"
                      href="https://oikoscash.medium.com/oikos-2025-a54f1b4fc5d9"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View Announcement
                    </Button>
                  </Box>
                  <Box>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => gaEventTracker("read_docs")}
                      as="a"
                      href="https://docs.oikos.cash/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Explore Docs
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </Stack>
          </Box>
          {showIllustration && (
            <Box flex="1" display="flex" justifyContent="flex-end">
              <Box
                position="relative"
                maxW="420px"
                w="full"
                borderRadius="3xl"
                overflow="hidden"
                border="1px solid"
                borderColor="border.muted"
                bg="linear-gradient(160deg, rgba(28,36,31,0.65) 0%, rgba(9,12,11,0.85) 100%)"
                boxShadow="subtle"
              >
                <Box
                  position="absolute"
                  inset={0}
                  bg="radial-gradient(70% 70% at 70% 20%, rgba(74, 222, 128, 0.18), transparent)"
                  zIndex={0}
                />
                <Box position="relative" zIndex={1} p={8}>
                  <Image
                    src={ArtImage}
                    alt="Noma Protocol illustration"
                    w="full"
                    h="full"
                    objectFit="contain"
                  />
                </Box>
              </Box>
            </Box>
          )}
        </Flex>
      </Box>
    </Box>
  );
};

export default Hero;
