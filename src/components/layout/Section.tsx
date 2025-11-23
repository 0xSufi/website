import React, { ReactNode } from "react";
import { Box, Flex, Stack, Heading, Text } from "@chakra-ui/react";

type SectionProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  spacing?: number | Record<string, number>;
  children: ReactNode;
  id?: string;
};

const prepareChildren = (children: ReactNode) =>
  React.Children.toArray(children)
    .filter(Boolean)
    .map((child, index) => <Box key={`section-item-${index}`}>{child}</Box>);

export const Section: React.FC<SectionProps> = ({
  title,
  description,
  action,
  spacing = { base: 8, md: 10 },
  children,
  id,
}) => {
  return (
    <Box
      as="section"
      id={id}
      bg="bg.surface"
      border="1px solid"
      borderColor="border.muted"
      borderRadius="2xl"
      boxShadow="surface"
      backdropFilter="blur(18px)"
      px={{ base: 6, md: 8 }}
      py={{ base: 8, md: 10 }}
    >
      <Box>
        <Stack spacing={spacing}>
          {(title || description || action) && (
            <Box>
              <Flex
                direction={{ base: "column", md: "row" }}
                justify="space-between"
                align={{ base: "flex-start", md: "center" }}
                gap={{ base: 4, md: 6 }}
              >
                <Box flex="1">
                  <Stack spacing={{ base: 2, md: 3 }}>
                    {title && (
                      <Box>
                        <Heading size="lg" fontWeight={600}>
                          {title}
                        </Heading>
                      </Box>
                    )}
                    {description && (
                      <Box>
                        <Text color="text.subtle" fontSize={{ base: "sm", md: "md" }} maxW="2xl">
                          {description}
                        </Text>
                      </Box>
                    )}
                  </Stack>
                </Box>
                {action && (
                  <Box>
                    <Box>{action}</Box>
                  </Box>
                )}
              </Flex>
            </Box>
          )}
          <Box>
            <Stack spacing={{ base: 6, md: 8 }}>{prepareChildren(children)}</Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default Section;
