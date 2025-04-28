import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "dark",
    background: {
      default: "#0D0D0D", // near pure black
      paper: "#1A1A1A", // slightly lighter surface
    },
    primary: {
      main: "#FF9900", // bold orange
      contrastText: "#000000",
    },
    secondary: {
      main: "#FFCC80", // lighter orange for accents
      contrastText: "#000000",
    },
    text: {
      primary: "#E0E0E0", // soft white
      secondary: "#A0A0A0", // muted gray
      disabled: "#555555",
    },
    divider: "rgba(255,255,255,0.12)",
    error: {
      main: "#FF5370",
    },
    warning: {
      main: "#FFA726",
    },
    info: {
      main: "#64B5F6",
    },
    success: {
      main: "#81C784",
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    fontSize: 14,
  },
  shape: {
    borderRadius: 8,
  },
});

export default theme;
