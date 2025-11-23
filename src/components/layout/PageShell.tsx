import React, { ReactNode } from "react";
import { Box, Container, Flex, Stack, Text, Heading } from "@chakra-ui/react";

type PageShellProps = {
  title?: string;
  description?: string;
  toolbar?: ReactNode;
  spacing?: number | Record<string, number>;
  children: ReactNode;
};

const wrapStackChildren = (children: ReactNode) =>
  React.Children.toArray(children)
    .filter(Boolean)
    .map((child, index) => (
      <Box key={`stack-item-${index}`}>{child}</Box>
    ));

export const PageShell: React.FC<PageShellProps> = ({
  title,
  description,
  toolbar,
  spacing = { base: 10, md: 12 },
  children,
}) => {
  return (
    <Box as="main" bg="bg.canvas" minH="100vh" pt={{ base: 20, md: 24 }} pb={{ base: 24, md: 32 }}>
      <Box>
        <Container maxW="7xl" px={{ base: 6, md: 10 }}>
          <Box>
            <Stack spacing={spacing}>
              {(title || description || toolbar) && (
                <Box>
                  <Flex
                    direction={{ base: "column", md: "row" }}
                    align={{ base: "flex-start", md: "center" }}
                    justify="space-between"
                    gap={{ base: 6, md: 8 }}
                  >
                    <Box flex="1">
                      <Stack spacing={{ base: 3, md: 4 }}>
                        {title && (
                          <Box>
                            <Heading size="xl" fontWeight={700} letterSpacing="-0.02em">
                              {title}
                            </Heading>
                          </Box>
                        )}
                        {description && (
                          <Box>
                            <Text color="text.subtle" fontSize={{ base: "md", md: "lg" }} maxW="3xl">
                              {description}
                            </Text>
                          </Box>
                        )}
                      </Stack>
                    </Box>
                    {toolbar && (
                      <Box
                        w={{ base: "full", md: "auto" }}
                        display="flex"
                        justifyContent={{ base: "stretch", md: "flex-end" }}
                      >
                        <Box>{toolbar}</Box>
                      </Box>
                    )}
                  </Flex>
                </Box>
              )}
              <Box>
                <Stack spacing={spacing}>{wrapStackChildren(children)}</Stack>
              </Box>
            </Stack>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default PageShell;
