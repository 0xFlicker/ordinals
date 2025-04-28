import { FC, PropsWithChildren } from "react";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomModal: FC<PropsWithChildren<CustomModalProps>> = ({
  isOpen,
  onClose,
  children,
}) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      slotProps={{
        backdrop: {
          sx: { backgroundColor: "rgba(0,0,0,0.6)" },
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "auto",
          maxWidth: "90%",
          maxHeight: "90%",
          overflow: "auto",
          bgcolor: "background.default",
          borderRadius: 1,
          boxShadow: 24,
          p: 4,
        }}
      >
        {children}
      </Box>
    </Modal>
  );
};
