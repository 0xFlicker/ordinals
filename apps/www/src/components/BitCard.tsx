import { FC, PropsWithChildren } from "react";
import Card, { CardProps } from "@mui/material/Card";
import Paper from "@mui/material/Paper";
import { CardContent } from "@mui/material";

const BG_IMG = "/images/frame.png";

export const BitCard: FC<PropsWithChildren<CardProps>> = ({
  children,
  ...props
}) => {
  return (
    <Card
      {...props}
      sx={{
        ...props.sx,
        backgroundImage: `url(${BG_IMG})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        borderRadius: 4,
        overflow: "hidden",
      }}
      component={Paper}
      elevation={4}
    >
      {children}
    </Card>
  );
};
