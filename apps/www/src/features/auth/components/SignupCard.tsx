"use client";
import { FC, useCallback, useState, useEffect, useRef } from "react";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import InputLabel from "@mui/material/InputLabel";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import CheckIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/ErrorRounded";
import { useXverse } from "@/features/xverse";
import { useXverseConnect } from "@/features/xverse/hooks/useXverseConnect";
import { useSignupAnonymouslyMutation } from "../hooks/signUp.generated";
import { useRouter } from "next/navigation";
import { useCheckNameLazyQuery } from "../hooks/checkName.generated";
import { useGetAppInfoQuery } from "../hooks/app.generated";

// Define the possible states for the signup flow
type SignupState = "CONNECT" | "SIGN" | "PICK_HANDLE";

const ConnectContent: FC = () => {
  return (
    <Box sx={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
      <Typography variant="h6" gutterBottom>
        Connect your Bitcoin wallet
      </Typography>
      <Typography variant="body2" color="text.secondary">
        To get started, connect your Bitcoin wallet to create an account
      </Typography>
    </Box>
  );
};

const SignContent: FC = () => {
  return (
    <Box sx={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
      <Typography variant="h6" gutterBottom>
        Sign with your Bitcoin wallet
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Please sign the message to verify your wallet ownership
      </Typography>
    </Box>
  );
};

const PickHandleContent: FC<{
  handle: string; // handle to be checked
  updateHandle: (handle: string) => void; // update the handle
  isValid?: boolean; // is the handle valid. If undefined, the handle is not checked yet
  error?: string; // error message if the handle is invalid
  isLoadingCheckName: boolean; // is the handle being checked
}> = ({ handle, updateHandle, isValid, error, isLoadingCheckName }) => {
  return (
    <Box sx={{ width: "100%", maxWidth: 400 }}>
      <Typography variant="h6" gutterBottom>
        Choose your handle
      </Typography>
      <TextField
        fullWidth
        label="Handle"
        value={handle}
        onChange={(e) => updateHandle(e.target.value)}
        error={isValid === false}
        helperText={error || " "}
        InputProps={{
          endAdornment: isLoadingCheckName ? (
            <CircularProgress size={20} />
          ) : isValid === true ? (
            <CheckIcon color="success" />
          ) : isValid === false ? (
            <ErrorIcon color="error" />
          ) : null,
        }}
        sx={{ mb: 2 }}
      />
      <Typography variant="body2" color="text.secondary">
        This will be your unique identifier on the platform
      </Typography>
    </Box>
  );
};

export const SignupCard: FC = () => {
  const router = useRouter();
  const { handleBitcoinConnect, isConnected, isConnecting, ordinalsAddress } =
    useXverseConnect();

  const [signupAnonymously] = useSignupAnonymouslyMutation();
  const [checkName, { data: checkNameData, loading: isLoadingCheckName }] =
    useCheckNameLazyQuery();

  // State management
  const [signupState, setSignupState] = useState<SignupState>("CONNECT");
  const [handle, setHandle] = useState("");
  const [isValid, setIsValid] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);
  const [token, setToken] = useState<string | null>(null);
  const [isHandleVerified, setIsHandleVerified] = useState(false);

  // Keep track of the last checked handle
  const lastCheckedHandleRef = useRef<string>("");

  // Update signup state based on connection status
  useEffect(() => {
    if (isConnected && signupState === "CONNECT") {
      setSignupState("SIGN");
    }
  }, [isConnected, signupState]);

  // Check handle validity when it changes
  useEffect(() => {
    if (handle.length > 0 && handle !== lastCheckedHandleRef.current) {
      // Reset verification state when handle changes
      setIsHandleVerified(false);

      const timer = setTimeout(() => {
        checkName({
          variables: { handle },
        });
      }, 500); // Debounce the check

      return () => clearTimeout(timer);
    } else if (handle.length === 0) {
      setIsValid(undefined);
      setError(undefined);
      setIsHandleVerified(false);
    }
  }, [handle, checkName]);

  // Update validation state when check result changes
  useEffect(() => {
    if (checkNameData !== undefined) {
      const handleExists = checkNameData.checkUserExistsForHandle;
      setIsValid(!handleExists);
      setError(handleExists ? "This handle is already taken" : undefined);

      // Mark handle as verified and update the last checked handle
      setIsHandleVerified(true);
      lastCheckedHandleRef.current = handle;
    }
  }, [checkNameData, handle]);

  // Handle the connect button click
  const handleConnect = useCallback(async () => {
    if (["CONNECT", "SIGN"].includes(signupState)) {
      const newToken = await handleBitcoinConnect();
      if (newToken) {
        setToken(newToken);
        setSignupState("PICK_HANDLE");
      }
    }
  }, [handleBitcoinConnect, signupState]);

  // Handle the signup with handle
  const handleSignup = useCallback(async () => {
    if (token && isValid === true && isHandleVerified) {
      const { data } = await signupAnonymously({
        variables: {
          request: {
            token,
            handle,
          },
        },
      });
      if (data?.signupAnonymously.user) {
        router.push(`/`);
      }
    }
  }, [token, handle, isValid, isHandleVerified, signupAnonymously, router]);

  // Handle updating the handle
  const updateHandle = useCallback((newHandle: string) => {
    setHandle(newHandle);
  }, []);

  // Render the appropriate content based on the current state
  const renderContent = useCallback(() => {
    switch (signupState) {
      case "CONNECT":
        return <ConnectContent />;
      case "SIGN":
        return <SignContent />;
      case "PICK_HANDLE":
        return (
          <PickHandleContent
            handle={handle}
            updateHandle={updateHandle}
            isValid={isValid}
            error={error}
            isLoadingCheckName={isLoadingCheckName}
          />
        );
      default:
        return <ConnectContent />;
    }
  }, [signupState, handle, isValid, error, isLoadingCheckName, updateHandle]);

  // Determine button text and action based on state
  const getButtonProps = useCallback(() => {
    switch (signupState) {
      case "CONNECT":
        return {
          text: "Connect",
          onClick: handleConnect,
          disabled: isConnecting,
        };
      case "SIGN":
        return {
          text: "Sign",
          onClick: handleConnect,
          disabled: isConnecting,
        };
      case "PICK_HANDLE":
        return {
          text: "Create Account",
          onClick: handleSignup,
          disabled: isValid !== true || isLoadingCheckName || !isHandleVerified,
        };
      default:
        return {
          text: "Connect",
          onClick: handleConnect,
          disabled: isConnecting,
        };
    }
  }, [
    signupState,
    handleConnect,
    handleSignup,
    isConnecting,
    isValid,
    isLoadingCheckName,
    isHandleVerified,
  ]);

  const buttonProps = getButtonProps();

  return (
    <Card
      sx={{
        minWidth: {
          xs: "100%",
          md: 400,
        },
        maxWidth: 600,
        minHeight: 600,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHeader title="Sign Up" />
      <CardContent
        sx={{
          flexGrow: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {renderContent()}
      </CardContent>
      <CardActions sx={{ p: 2 }}>
        <Button
          onClick={buttonProps.onClick}
          disabled={buttonProps.disabled}
          fullWidth
        >
          {buttonProps.text}
        </Button>
      </CardActions>
    </Card>
  );
};
