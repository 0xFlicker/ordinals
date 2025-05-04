"use client";

import { FC, useState, useEffect, useCallback, useRef } from "react";
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
import { BitCard } from "@/components/BitCard";
import { useBitflickWallet } from "@/features/wallet-standard/Context";
import { useAuth } from "@/features/auth";
import { useCheckNameLazyQuery } from "../hooks/checkName.generated";
import {
  IUser,
  IUserWithAddresses,
  IUserWithRoles,
  UserWithRolesModel,
} from "@0xflick/ordinals-rbac-models";
import { useRouter } from "next/navigation";
import { SignInType } from "../ducks";

// UI stages for onboarding
type Stage =
  | { type: "CONNECT" }
  | { type: "SIGN"; address: string }
  | { type: "CHOICE_NEW_USER"; address: string; token: string }
  | {
      type: "CHOICE_EXISTING_USER_NEW_ADDRESS";
      ordinalsAddress?: string;
      evmAddress?: string;
      token: string;
    }
  | { type: "PICK_HANDLE"; address: string; token: string }
  | { type: "DONE" };

export interface OnboardingCardProps {
  initialUser?: IUserWithRoles | IUserWithAddresses;
  onComplete?: (user: IUserWithRoles | IUserWithAddresses) => void;
  redirectPath?: string;
}

export const OnboardingCard: FC<OnboardingCardProps> = ({
  initialUser,
  onComplete,
  redirectPath,
}) => {
  const router = useRouter();
  const {
    connectAsync,
    loginAsync,
    loginBtcAsync,
    loginEvmAsync,
    isConnected,
    isConnecting,
    btcAccounts,
  } = useBitflickWallet();

  const { signUpAnonymously, linkVerifiedAddressBtc, linkVerifiedAddressEvm } =
    useAuth();

  // handle-pick state
  const [handle, setHandle] = useState("");
  const [checkName, { data: checkNameData, loading: isLoadingCheckName }] =
    useCheckNameLazyQuery();
  const lastCheckedRef = useRef("");

  const [isValid, setIsValid] = useState<boolean | undefined>(undefined);
  const [error, setError] = useState<string | undefined>(undefined);

  // onboarding stage
  const [stage, setStage] = useState<Stage>({ type: "CONNECT" });
  // store anon token for PICK_HANDLE
  const [anonToken, setAnonToken] = useState<string>("");

  // 1) when wallet connects, move to SIGN stage
  useEffect(() => {
    if (isConnected && stage.type === "CONNECT") {
      const address = btcAccounts[0]?.address;
      if (address) {
        setStage({ type: "SIGN", address });
      }
    }
  }, [isConnected, stage.type, btcAccounts]);

  // 2) handle checks for handle validity
  useEffect(() => {
    if (
      stage.type === "PICK_HANDLE" &&
      handle &&
      handle !== lastCheckedRef.current
    ) {
      setIsValid(undefined);
      setError(undefined);
      const timer = setTimeout(() => {
        checkName({ variables: { handle } });
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [checkName, handle, stage.type]);

  // update validity when check finishes
  useEffect(() => {
    if (checkNameData && stage.type === "PICK_HANDLE") {
      const exists = checkNameData.checkUserExistsForHandle;
      setIsValid(!exists);
      setError(exists ? "Handle taken" : undefined);
      lastCheckedRef.current = handle;
    }
  }, [checkNameData, handle, stage.type]);

  // actions
  const handleConnect = useCallback(async () => {
    try {
      const response = await connectAsync();
      // setStage({ type: "SIGN", address: response.provider.chainType === "btc" && "addresses" in response ? response.addresses[0].address : response.accounts[0].address });
      if (response.provider.chainType === "btc" && "addresses" in response) {
        const address = response.addresses[0].address;
        setStage({
          type: "SIGN",
          address,
        });
        await loginAsync({ btc: true, address });
      } else if (
        response.provider.chainType === "evm" &&
        "accounts" in response
      ) {
        const address = response.accounts[0].address;
        setStage({
          type: "SIGN",
          address,
        });
        const loginResponse = await loginBtcAsync(address);
        if (loginResponse.user && loginResponse.type === "EXISTING_USER") {
          onComplete?.(loginResponse.user);
          setStage({ type: "DONE" });
          router.push(redirectPath ?? "/");
        } else if (loginResponse.token && loginResponse.type === "NEW_USER") {
          setAnonToken(loginResponse.token);
          setStage({
            type: "CHOICE_NEW_USER",
            address,
            token: loginResponse.token,
          });
        } else if (
          loginResponse.token &&
          loginResponse.type === "LINKED_USER_REQUEST"
        ) {
          setStage({
            type: "CHOICE_EXISTING_USER_NEW_ADDRESS",
            ordinalsAddress: address,
            token: loginResponse.token,
          });
        }
      }
      // evm
      if (response.provider.chainType === "evm" && "accounts" in response) {
        const address = response.accounts[0].address;
        setStage({
          type: "SIGN",
          address,
        });
        const loginResponse = await loginEvmAsync(address);
        if (loginResponse.user && loginResponse.type === "EXISTING_USER") {
          onComplete?.(loginResponse.user);
          setStage({ type: "DONE" });
          router.push(redirectPath ?? "/");
        } else if (loginResponse.token && loginResponse.type === "NEW_USER") {
          setAnonToken(loginResponse.token);
          setStage({
            type: "CHOICE_NEW_USER",
            address,
            token: loginResponse.token,
          });
        } else if (
          loginResponse.token &&
          loginResponse.type === "LINKED_USER_REQUEST"
        ) {
          setStage({
            type: "CHOICE_EXISTING_USER_NEW_ADDRESS",
            evmAddress: address,
            token: loginResponse.token,
          });
        }
      }
    } catch (error) {
      console.error(error);
      setError("Failed to connect wallet");
    }
  }, [
    connectAsync,
    loginAsync,
    loginBtcAsync,
    loginEvmAsync,
    onComplete,
    redirectPath,
    router,
  ]);

  const handleSign = useCallback(async () => {
    if (stage.type !== "SIGN") return;
    const { address } = stage;
    const loginResponse = await loginAsync({ address });
    if (loginResponse.user && loginResponse.type === "EXISTING_USER") {
      onComplete?.(loginResponse.user);
      setStage({ type: "DONE" });
      router.push(redirectPath ?? "/");
    } else if (loginResponse.token && loginResponse.type === "NEW_USER") {
      setAnonToken(loginResponse.token);
      setStage({
        type: "CHOICE_NEW_USER",
        address,
        token: loginResponse.token,
      });
    } else if (
      loginResponse.token &&
      loginResponse.type === "LINKED_USER_REQUEST"
    ) {
      setStage({
        type: "CHOICE_EXISTING_USER_NEW_ADDRESS",
        ordinalsAddress: address,
        token: loginResponse.token,
      });
    }
  }, [stage, loginAsync, onComplete, router, redirectPath]);

  const handleChoiceSignup = useCallback(() => {
    if (stage.type === "CHOICE_NEW_USER") {
      setStage({
        type: "PICK_HANDLE",
        address: stage.address,
        token: stage.token,
      });
    }
  }, [stage]);

  const currentToken = "token" in stage ? stage.token : undefined;
  const handleChoiceAnon = useCallback(async () => {
    if (stage.type === "CHOICE_NEW_USER" && currentToken) {
      setStage({ type: "DONE" });
      router.push(redirectPath ?? "/");
    } else if (
      stage.type === "CHOICE_EXISTING_USER_NEW_ADDRESS" &&
      currentToken
    ) {
      setStage({ type: "DONE" });
      router.push(redirectPath ?? "/");
    }
  }, [stage.type, currentToken, router, redirectPath]);

  const handleSignup = useCallback(async () => {
    if (stage.type !== "PICK_HANDLE" || !isValid) return;
    const { user } = await signUpAnonymously({
      token: stage.token,
      handle,
    });
    onComplete?.(user);
    setStage({ type: "DONE" });
    router.push(redirectPath ?? "/");
  }, [
    stage,
    isValid,
    handle,
    signUpAnonymously,
    onComplete,
    router,
    redirectPath,
  ]);

  const handleLinkNewAddress = useCallback(async () => {
    if (
      stage.type === "CHOICE_EXISTING_USER_NEW_ADDRESS" &&
      "ordinalsAddress" in stage &&
      typeof stage.ordinalsAddress !== "undefined"
    ) {
      const { user } = await linkVerifiedAddressBtc(
        stage.ordinalsAddress,
        stage.token
      );
      onComplete?.(user);
      setStage({ type: "DONE" });
      router.push(redirectPath ?? "/");
    } else if (
      stage.type === "CHOICE_EXISTING_USER_NEW_ADDRESS" &&
      "evmAddress" in stage &&
      typeof stage.evmAddress !== "undefined"
    ) {
      const { user } = await linkVerifiedAddressEvm(
        stage.evmAddress,
        stage.token
      );
      onComplete?.(user);
      setStage({ type: "DONE" });
      router.push(redirectPath ?? "/");
    }
  }, [
    stage,
    linkVerifiedAddressBtc,
    onComplete,
    router,
    redirectPath,
    linkVerifiedAddressEvm,
  ]);

  const handleContinue = useCallback(() => {
    if (initialUser) {
      onComplete?.(initialUser);
      setStage({ type: "DONE" });
      router.push(redirectPath ?? "/");
    }
  }, [initialUser, onComplete, router, redirectPath]);

  // UI
  let content: JSX.Element;
  let buttons: Array<{ text: string; onClick: () => void; disabled: boolean }> =
    [];

  switch (stage.type) {
    case "CONNECT":
      content = <ConnectContent initialUser={initialUser} />;
      buttons = [
        ...(initialUser
          ? [
              {
                text: "Continue",
                onClick: handleContinue,
                disabled: false,
              },
            ]
          : []),
        {
          text: "Connect New Wallet",
          onClick: handleConnect,
          disabled: isConnecting,
        },
      ];
      break;
    case "SIGN":
      content = <SignContent />;
      buttons = [
        { text: "Sign Message", onClick: handleSign, disabled: isConnecting },
      ];
      break;
    case "CHOICE_NEW_USER":
      content = (
        <Box textAlign="center">
          <Typography gutterBottom>Choose an option</Typography>
          <Typography variant="body2" color="text.secondary">
            Continue as guest or create an account.
          </Typography>
        </Box>
      );
      buttons = [
        {
          text: "Create Account",
          onClick: handleChoiceSignup,
          disabled: false,
        },
        {
          text: "Continue as Guest",
          onClick: handleChoiceAnon,
          disabled: false,
        },
      ];
      break;
    case "CHOICE_EXISTING_USER_NEW_ADDRESS":
      content = <Typography>Choose an option</Typography>;
      buttons = [
        {
          text: "Link Address",
          onClick: handleLinkNewAddress,
          disabled: false,
        },
        {
          text: "Sign In Anonymously",
          onClick: handleChoiceAnon,
          disabled: false,
        },
      ];
      break;
    case "PICK_HANDLE":
      content = (
        <PickHandleContent
          handle={handle}
          updateHandle={setHandle}
          isValid={isValid}
          error={error}
          isLoadingCheckName={isLoadingCheckName}
        />
      );
      buttons = [
        { text: "Create Account", onClick: handleSignup, disabled: !isValid },
      ];
      break;
    default:
      content = <Typography>Done!</Typography>;
      buttons = [];
  }

  return (
    <BitCard
      sx={{
        minWidth: {
          xs: "100%",
          md: 600,
        },
        minHeight: {
          xs: "100%",
          md: 600,
        },
        maxWidth: {
          xs: "100%",
          md: 600,
        },
        maxHeight: {
          xs: "100%",
          md: 600,
        },
        p: 2,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <CardHeader title="Welcome to Bitflick" />
      <CardContent
        sx={{
          flexGrow: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {content}
      </CardContent>
      <CardActions>
        {buttons.map((b) => (
          <Button
            key={b.text}
            onClick={b.onClick}
            disabled={b.disabled}
            fullWidth
          >
            {b.text}
          </Button>
        ))}
      </CardActions>
    </BitCard>
  );
};

// re-export small content blocks
const ConnectContent: FC<{
  initialUser?: IUser;
}> = ({ initialUser }) => (
  <Box textAlign="center">
    {initialUser ? (
      <>
        <Typography variant="h6" gutterBottom>
          Welcome back {initialUser.handle}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Continue to the app or connect a new wallet.
        </Typography>
      </>
    ) : (
      <>
        <Typography variant="h6" gutterBottom>
          Connect your Bitcoin Wallet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          To get started, connect your wallet.
        </Typography>
      </>
    )}
  </Box>
);

const SignContent: FC = () => (
  <Box textAlign="center">
    <Typography variant="h6" gutterBottom>
      Sign a Verification Message
    </Typography>
    <Typography variant="body2" color="text.secondary">
      This proves you own the wallet.
    </Typography>
  </Box>
);

const PickHandleContent: FC<{
  handle: string;
  updateHandle: (h: string) => void;
  isValid?: boolean;
  error?: string;
  isLoadingCheckName: boolean;
}> = ({ handle, updateHandle, isValid, error, isLoadingCheckName }) => (
  <Box sx={{ width: "100%" }}>
    <Typography variant="h6" gutterBottom>
      Choose a Handle
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
      sx={{ mb: 1 }}
    />
    <Typography variant="body2" color="text.secondary">
      This will be your public identifier.
    </Typography>
  </Box>
);
