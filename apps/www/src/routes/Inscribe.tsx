"use client";
import { FC, useCallback, useState, useEffect, useMemo } from "react";
import Grid2 from "@mui/material/Grid";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import { Pay } from "@/features/inscription";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import Dropzone from "react-dropzone";
import { useCreateCollectionWithUpload } from "@/features/collections/hooks/useCreateCollectionWithUpload";
import { BitcoinNetwork, FeeLevel } from "@/graphql/types";
import { useRouter } from "next/navigation";
import {
  InscribeError,
  useInscribe,
} from "@/features/inscribe/hooks/useInscribe";
import Card from "@mui/material/Card";
import { CardContent } from "@mui/material";
import { useFeeEstimateQuery } from "@/features/inscribe/hooks/bitcoinFees.generated";
import { toGraphqlBitcoinNetwork } from "@/graphql/transforms";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import InputAdornment from "@mui/material/InputAdornment";
import CircularProgress from "@mui/material/CircularProgress";
import { useBitflickWallet } from "@/features/wallet-standard/Context";
import { Address } from "@cmdcode/tapscript";
import { useAuth } from "@/features/auth";

export const Inscribe: FC<{}> = () => {
  const router = useRouter();
  const [ordinalsAddress, setOrdinalsAddress] = useState<string>("");
  const [network, setNetwork] = useState<BitcoinNetworkType>(
    BitcoinNetworkType.Mainnet
  );
  const [inscribeError, setInscribeError] = useState<InscribeError | null>(
    null
  );
  const [feeMode, setFeeMode] = useState<"preset" | "custom">("preset");
  const [feeLevel, setFeeLevel] = useState<FeeLevel>(FeeLevel.Medium);
  const [customFeeRate, setCustomFeeRate] = useState<number>(10);
  const [networkSelectOpen, setNetworkSelectOpen] = useState<boolean>(false);
  const [feeLevelSelectOpen, setFeeLevelSelectOpen] = useState<boolean>(false);

  const isValidOrdinalsAddress = useMemo(() => {
    try {
      const address = Address.decode(ordinalsAddress);
      return address.type === "p2tr";
    } catch (error) {
      return false;
    }
  }, [ordinalsAddress]);

  const { data: feeEstimate, loading: feeEstimateLoading } =
    useFeeEstimateQuery({
      variables: {
        network: toGraphqlBitcoinNetwork(
          (network.charAt(0).toUpperCase() +
            network.slice(1)) as BitcoinNetworkType
        ),
      },
    });
  const {
    isConnected,
    ordinalsAddress: discoveredAddress,
    connectBtcAsync,
    loginBtcAsync,
  } = useBitflickWallet();

  const handleWalletClick = useCallback(async () => {
    if (isConnected && discoveredAddress) {
      setOrdinalsAddress(discoveredAddress);
      return;
    }
    const result = await connectBtcAsync({
      network,
    });
    if (result && result.addresses.length > 0) {
      setOrdinalsAddress(result.addresses[0].address);
    }
  }, [connectBtcAsync, discoveredAddress, isConnected, network]);

  const { handleCreate, paymentRequest } = useInscribe({
    network: network
      ? toGraphqlBitcoinNetwork(network)
      : BitcoinNetwork.Mainnet,
    destinationAddress: ordinalsAddress,
    feeLevel: feeMode === "preset" ? feeLevel : undefined,
    feePerByte: feeMode === "custom" ? customFeeRate : undefined,
  });

  useEffect(() => {
    if (paymentRequest) {
      router.push(`/pay/${paymentRequest.id}`);
    }
  }, [paymentRequest, router]);

  const handleDrop = useCallback(
    async (files: File[]) => {
      try {
        if (!isConnected) {
          const result = await connectBtcAsync({
            network,
          });
          if (result && result.addresses.length > 0) {
            await loginBtcAsync({
              address: result.addresses[0].address,
              network,
            });
          }
        }

        handleCreate(files);
      } catch (error: unknown) {
        if (error instanceof InscribeError) {
          setInscribeError(error);
        } else {
          throw error;
        }
      }
    },
    [isConnected, handleCreate, connectBtcAsync, loginBtcAsync, network]
  );

  const handleCustomFeeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseInt(event.target.value, 10);
    if (!isNaN(value) && value >= 1) {
      setCustomFeeRate(value);
    }
  };

  // Common select styling
  const selectMenuProps = {
    PaperProps: {
      sx: {
        "& .MuiMenuItem-root": {
          backgroundImage:
            "linear-gradient(rgba(69, 69, 69, 0.69), rgba(69, 69, 69, 0.69))",
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundImage:
              "linear-gradient(rgba(100, 100, 100, 0.8), rgba(100, 100, 100, 0.8))",
            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.2)",
          },
        },
        "& .Mui-selected": {
          backgroundImage:
            "linear-gradient(rgba(25, 118, 210, 0.8), rgba(25, 118, 210, 0.8))",
          color: "white",
          fontWeight: "bold",
          "&:hover": {
            backgroundImage:
              "linear-gradient(rgba(25, 118, 210, 0.9), rgba(25, 118, 210, 0.9))",
            boxShadow: "0 2px 5px rgba(0, 0, 0, 0.3)",
          },
        },
      },
    },
  };

  return (
    <>
      {paymentRequest ? (
        <Grid2 container spacing={2} sx={{ mt: 10 }} columns={12}>
          <Grid2 size={12}>
            <Pay
              fundingId={paymentRequest.id}
              network={paymentRequest.network}
            />
          </Grid2>
        </Grid2>
      ) : (
        <Card sx={{ mt: 4, p: 4 }}>
          <CardContent>
            <Grid2 container spacing={2} columns={12}>
              <Grid2
                sx={{
                  mt: 4,
                }}
                size={12}
              >
                <Typography variant="h6" gutterBottom>
                  Inscribe
                </Typography>
                <Select
                  value={network}
                  onChange={(e) =>
                    setNetwork(e.target.value as BitcoinNetworkType)
                  }
                  fullWidth
                  sx={{ mb: 2 }}
                  onOpen={() => setNetworkSelectOpen(true)}
                  onClose={() => setNetworkSelectOpen(false)}
                  MenuProps={selectMenuProps}
                >
                  <MenuItem value={BitcoinNetworkType.Mainnet}>
                    Mainnet
                  </MenuItem>
                  <MenuItem value={BitcoinNetworkType.Testnet4}>
                    Testnet4
                  </MenuItem>
                </Select>
                {(networkSelectOpen || feeLevelSelectOpen) && (
                  <Box
                    sx={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 1200,
                      backdropFilter: "blur(2px)",
                      pointerEvents: "none",
                    }}
                  />
                )}
                <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={handleWalletClick}
                    disabled={
                      isConnected && ordinalsAddress === discoveredAddress
                    }
                  >
                    {isConnected ? "Wallet" : "Connect"}
                  </Button>
                  <TextField
                    label="Ordinals Address"
                    value={ordinalsAddress}
                    onChange={(e) => setOrdinalsAddress(e.target.value)}
                    fullWidth
                  />
                </Box>

                {/* Fee Selection Section */}
                <Box sx={{ mb: 2 }}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Fee Selection</FormLabel>
                    <RadioGroup
                      row
                      value={feeMode}
                      onChange={(e) =>
                        setFeeMode(e.target.value as "preset" | "custom")
                      }
                    >
                      <FormControlLabel
                        value="preset"
                        control={<Radio />}
                        label="Preset Fee Levels"
                      />
                      <FormControlLabel
                        value="custom"
                        control={<Radio />}
                        label="Custom Fee Rate"
                      />
                    </RadioGroup>
                  </FormControl>

                  {feeMode === "preset" ? (
                    <Box sx={{ mt: 2 }}>
                      <FormControl fullWidth>
                        <FormLabel>Fee Level</FormLabel>
                        <Select
                          value={feeLevel}
                          onChange={(e) =>
                            setFeeLevel(e.target.value as FeeLevel)
                          }
                          disabled={feeEstimateLoading}
                          MenuProps={selectMenuProps}
                          onOpen={() => setFeeLevelSelectOpen(true)}
                          onClose={() => setFeeLevelSelectOpen(false)}
                        >
                          <MenuItem value={FeeLevel.Glacial}>
                            Glacial (
                            {feeEstimateLoading
                              ? "..."
                              : feeEstimate?.currentBitcoinFees.data?.minimum ||
                                "N/A"}{" "}
                            sats/vB)
                          </MenuItem>
                          <MenuItem value={FeeLevel.Low}>
                            Low (
                            {feeEstimateLoading
                              ? "..."
                              : feeEstimate?.currentBitcoinFees.data?.hour ||
                                "N/A"}{" "}
                            sats/vB)
                          </MenuItem>
                          <MenuItem value={FeeLevel.Medium}>
                            Medium (
                            {feeEstimateLoading
                              ? "..."
                              : feeEstimate?.currentBitcoinFees.data
                                  ?.halfHour || "N/A"}{" "}
                            sats/vB)
                          </MenuItem>
                          <MenuItem value={FeeLevel.High}>
                            High (
                            {feeEstimateLoading
                              ? "..."
                              : feeEstimate?.currentBitcoinFees.data?.fastest ||
                                "N/A"}{" "}
                            sats/vB)
                          </MenuItem>
                        </Select>
                        {feeEstimateLoading && (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              mt: 1,
                            }}
                          >
                            <CircularProgress size={20} />
                          </Box>
                        )}
                      </FormControl>
                    </Box>
                  ) : (
                    <Box sx={{ mt: 2 }}>
                      <TextField
                        label="Custom Fee Rate"
                        type="number"
                        value={customFeeRate}
                        onChange={handleCustomFeeChange}
                        fullWidth
                        inputProps={{ min: 1, step: 1 }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              sats/vB
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Grid2>
              <Grid2 size={12}>
                <Dropzone
                  onDrop={handleDrop}
                  multiple
                  disabled={!isValidOrdinalsAddress}
                >
                  {({ getRootProps, getInputProps }) => (
                    <Box
                      {...getRootProps()}
                      sx={{
                        width: "100%",
                        aspectRatio: "4/1",
                        border: "2px dashed #ccc",
                        borderRadius: 2,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: isValidOrdinalsAddress
                          ? "pointer"
                          : "not-allowed",
                        opacity: isValidOrdinalsAddress ? 1 : 0.5,
                        "&:hover": {
                          borderColor: isValidOrdinalsAddress
                            ? "primary.main"
                            : "#ccc",
                          backgroundColor: isValidOrdinalsAddress
                            ? "rgba(0, 0, 0, 0.04)"
                            : "transparent",
                        },
                      }}
                    >
                      <input {...getInputProps()} />
                      <Typography
                        variant="body1"
                        textAlign="center"
                        sx={{ mb: 1 }}
                      >
                        {isValidOrdinalsAddress
                          ? "Drag and drop some files here, or click to select files"
                          : "Please enter a valid Ordinals address to enable file upload"}
                      </Typography>
                      {inscribeError && (
                        <Typography color="error" textAlign="center">
                          {inscribeError.message}
                        </Typography>
                      )}
                    </Box>
                  )}
                </Dropzone>
              </Grid2>
            </Grid2>
          </CardContent>
        </Card>
      )}
    </>
  );
};
