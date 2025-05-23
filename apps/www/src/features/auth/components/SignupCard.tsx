"use client";
import { FC, useCallback, useState, useEffect, useRef } from "react";
import Typography from "@mui/material/Typography";
import CardHeader from "@mui/material/CardHeader";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import CheckIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/ErrorRounded";
import { useSignUpAnonymouslyMutation } from "../hooks/signUp.generated";
import { useRouter } from "next/navigation";
import { useCheckNameLazyQuery } from "../hooks/checkName.generated";
import {
  IUserWithAddresses,
  IUserWithRoles,
  UserWithRolesModel,
} from "@0xflick/ordinals-rbac-models";
import { useBitflickWallet } from "@/features/wallet-standard/Context";
import { BitCard } from "@/components/BitCard";

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

export const SignupCard: FC<{
  onSignup?: (user: IUserWithRoles | IUserWithAddresses) => void;
  redirectWhenConnectedPath?: string;
}> = ({ onSignup, redirectWhenConnectedPath }) => {
  const router = useRouter();
  // const { handleBitcoinConnect, isConnected, isConnecting, ordinalsAddress } =
  //   useXverseConnect();
  const {
    connectBtcAsync,
    loginBtcAsync,
    isConnected,
    isConnecting,
    setNeedsBitcoinSelection,
    btcAccounts,
    setIntent,
  } = useBitflickWallet();

  const [signUpAnonymously] = useSignUpAnonymouslyMutation();
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
    switch (signupState) {
      case "CONNECT":
        if (isConnected) {
          const response = await loginBtcAsync({
            address: btcAccounts[0].address,
          });
          if (response.user) {
            onSignup?.(response.user);
          } else if (response.token) {
            setToken(response.token);
            setSignupState("PICK_HANDLE");
          }
        } else {
          setNeedsBitcoinSelection(true);
          setIntent("login");
        }
        break;
      case "SIGN":
        if (btcAccounts.length > 0) {
          const response = await loginBtcAsync({
            address: btcAccounts[0].address,
          });
          if (!response) {
            setNeedsBitcoinSelection(true);
          } else if ("user" in response && response.user) {
            onSignup?.(response.user);
            return response;
          } else if ("token" in response && response.token) {
            setToken(response.token);
            setSignupState("PICK_HANDLE");
            return response;
          } else {
            setNeedsBitcoinSelection(true);
          }
        } else {
          setNeedsBitcoinSelection(true);
        }
        break;
    }
    // if (["CONNECT", "SIGN"].includes(signupState)) {
    //   const { token: newToken, user } = (await handleBitcoinConnect()) ?? {};
    //   if (user) {
    //     // If a user is returned, the address has already been used
    //     onSignup?.(user);
    //   } else if (newToken) {
    //     setToken(newToken);
    //     setSignupState("PICK_HANDLE");
    //   }
    // }
  }, [
    signupState,
    isConnected,
    btcAccounts,
    loginBtcAsync,
    onSignup,
    setNeedsBitcoinSelection,
    setIntent,
  ]);

  // Handle the signup with handle
  const handleSignup = useCallback(async () => {
    if (token && isValid === true && isHandleVerified) {
      const { data } = await signUpAnonymously({
        variables: {
          request: {
            token,
            handle,
          },
        },
      });
      if (data?.signUpAnonymously.user) {
        const user = new UserWithRolesModel({
          userId: data.signUpAnonymously.user.id,
          handle,
          roleIds: data.signUpAnonymously.user.roles.map((role) => role.id),
        });
        onSignup?.(user);
        if (redirectWhenConnectedPath) {
          router.push(redirectWhenConnectedPath);
        }
      }
    }
  }, [
    token,
    isValid,
    isHandleVerified,
    signUpAnonymously,
    handle,
    onSignup,
    redirectWhenConnectedPath,
    router,
  ]);

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
    <BitCard
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
    </BitCard>
  );
};
