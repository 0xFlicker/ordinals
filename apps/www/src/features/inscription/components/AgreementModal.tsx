import { FC, PropsWithChildren } from "react";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import CheckIcon from "@mui/icons-material/CheckBoxOutlined";
import CrossIcon from "@mui/icons-material/CancelOutlined";

export const AgreementModal: FC<
  PropsWithChildren<{
    onClose: () => void;
    onAgree: () => void;
  }>
> = ({ onAgree, onClose, children }) => {
  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        height: {
          xs: "80vh",
          xxl: "70vh",
        },
        flexGrow: 1,
      }}
    >
      <CardHeader title="Agreement" />
      {children}
      <CardContent>
        <Typography variant="body2" color="text.secondary">
          Before minting you agree this is a rug.
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small" endIcon={<CheckIcon />} onClick={onAgree}>
          agree
        </Button>
        <Button size="small" endIcon={<CrossIcon />} onClick={onClose}>
          disagree
        </Button>
      </CardActions>
    </Card>
  );
};
