import React from "react";
import { Box } from "@chakra-ui/react";
import { DialogContent, DialogContentProps } from "../ui/dialog";

type ModalSurfaceProps = DialogContentProps & {
  children: React.ReactNode;
};

export const ModalSurface: React.FC<ModalSurfaceProps> = ({ children, ...rest }) => {
  return (
    <DialogContent
      borderRadius="2xl"
      border="1px solid"
      borderColor="border.muted"
      bg="rgba(13, 13, 18, 0.94)"
      boxShadow="surface"
      backdropFilter="blur(22px)"
      {...rest}
    >
      {children}
    </DialogContent>
  );
};

export default ModalSurface;
