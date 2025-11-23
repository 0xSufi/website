import React, { ReactNode } from "react";
import { Box, BoxProps } from "@chakra-ui/react";

type SurfaceProps = BoxProps & {
  children: ReactNode;
  padding?: number | Record<string, number>;
};

export const Surface: React.FC<SurfaceProps> = ({
  children,
  padding = { base: 6, md: 8 },
  ...rest
}) => {
  return (
    <Box
      bg="bg.surface"
      border="1px solid"
      borderColor="border.muted"
      borderRadius="xl"
      boxShadow="surface"
      backdropFilter="blur(14px)"
      px={padding}
      py={padding}
      {...rest}
    >
      <Box>{children}</Box>
    </Box>
  );
};

export default Surface;
