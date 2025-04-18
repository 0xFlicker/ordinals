"use client";
import { FC, useCallback, useState, useEffect } from "react";
import { DefaultProvider } from "@/context/default";
import Grid2 from "@mui/material/Unstable_Grid2";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { Pay } from "@/features/inscription";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { AutoConnect } from "@/features/web3";
import Dropzone from "react-dropzone";
import { useCreateCollectionWithUpload } from "@/features/collections/hooks/useCreateCollectionWithUpload";
import { useSignMultipartUpload } from "@/features/inscribe/hooks/useSignMultipartUpload";
import { useCreateCollectionParentInscription } from "@/features/collections/hooks/useCreateCollectionParentInscription";
import { BitcoinNetwork, FeeLevel } from "@/graphql/types";
import { useRouter } from "next/navigation";
import {
  InscribeError,
  InscribeErrorTotalFileSizeTooLarge,
  useInscribe,
} from "@/features/inscribe/hooks/useInscribe";
import { useXverse } from "@/features/xverse";
import Typography from "@mui/material/Typography";
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

export const Inscribe: FC<{
  initialBitcoinNetwork: BitcoinNetworkType;
  initialBitcoinPurpose: AddressPurpose;
}> = ({ initialBitcoinNetwork, initialBitcoinPurpose }) => {
  const [ordinalsAddress, setOrdinalsAddress] = useState<string>("");
  const [network, setNetwork] = useState<string>("regtest");
  const [inscribeError, setInscribeError] = useState<InscribeError | null>(
    null
  );
  const [feeMode, setFeeMode] = useState<"preset" | "custom">("preset");
  const [feeLevel, setFeeLevel] = useState<FeeLevel>(FeeLevel.Medium);
  const [customFeeRate, setCustomFeeRate] = useState<number>(10);
  const [networkSelectOpen, setNetworkSelectOpen] = useState<boolean>(false);
  const [feeLevelSelectOpen, setFeeLevelSelectOpen] = useState<boolean>(false);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isSiwbPending, setIsSiwbPending] = useState<boolean>(false);

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
    state: { ordinalsAddress: xverseOrdinalsAddress, verifiedOrdinalsAddress },
    isConnected,
    connect,
    siwb,
  } = useXverse();

  const handleWalletClick = useCallback(async () => {
    if (!isConnected) {
      const { ordinalsAddress } = await connect();
      setOrdinalsAddress(ordinalsAddress);
    } else if (xverseOrdinalsAddress) {
      setOrdinalsAddress(xverseOrdinalsAddress);
    }
  }, [xverseOrdinalsAddress, isConnected, connect]);

  const { handleCreate, paymentRequest } = useInscribe({
    network: BitcoinNetwork.Regtest,
    destinationAddress: ordinalsAddress,
    feeLevel: feeMode === "preset" ? feeLevel : undefined,
    feePerByte: feeMode === "custom" ? customFeeRate : undefined,
  });

  const handleDrop = useCallback(
    async (files: File[]) => {
      try {
        if (!isConnected) {
          setIsConnecting(true);
          setPendingFiles(files);
          await connect();
          setIsConnecting(false);
          return;
        }

        if (!verifiedOrdinalsAddress) {
          setIsSiwbPending(true);
          await siwb();
          setIsSiwbPending(false);
          if (pendingFiles) {
            handleCreate(pendingFiles);
            setPendingFiles(null);
          }
          return;
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
    [
      handleCreate,
      isConnected,
      connect,
      siwb,
      verifiedOrdinalsAddress,
      pendingFiles,
    ]
  );

  // Effect to handle connection state changes
  useEffect(() => {
    if (isConnected && !isConnecting && pendingFiles) {
      // If we're connected but not verified, trigger SIWB
      if (!verifiedOrdinalsAddress) {
        setIsSiwbPending(true);
        siwb()
          .then(() => {
            setIsSiwbPending(false);
            handleCreate(pendingFiles);
            setPendingFiles(null);
          })
          .catch((error) => {
            if (error instanceof InscribeError) {
              setInscribeError(error);
            } else {
              throw error;
            }
          });
      } else {
        // If we're connected and verified, process the files directly
        handleCreate(pendingFiles);
        setPendingFiles(null);
      }
    }
  }, [
    isConnected,
    isConnecting,
    pendingFiles,
    verifiedOrdinalsAddress,
    siwb,
    handleCreate,
  ]);

  // Effect to handle SIWB state changes
  useEffect(() => {
    if (
      !isSiwbPending &&
      pendingFiles &&
      isConnected &&
      verifiedOrdinalsAddress
    ) {
      handleCreate(pendingFiles);
      setPendingFiles(null);
    }
  }, [
    isSiwbPending,
    pendingFiles,
    isConnected,
    verifiedOrdinalsAddress,
    handleCreate,
  ]);

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
        <Grid2 sx={{ mt: 4 }} xs={12} sm={12} md={12}>
          <Pay fundingId={paymentRequest.id} network={paymentRequest.network} />
        </Grid2>
      ) : (
        <Card sx={{ mt: 4, p: 4 }}>
          <CardContent>
            <Grid2 container spacing={2}>
              <Grid2 xs={12} sm={12} md={12}>
                <Typography variant="h6" gutterBottom>
                  Inscribe
                </Typography>
                <Select
                  value={network}
                  onChange={(e) => setNetwork(e.target.value)}
                  fullWidth
                  sx={{ mb: 2 }}
                  onOpen={() => setNetworkSelectOpen(true)}
                  onClose={() => setNetworkSelectOpen(false)}
                  MenuProps={selectMenuProps}
                >
                  <MenuItem value="mainnet">Mainnet</MenuItem>
                  <MenuItem value="testnet">Testnet</MenuItem>
                  <MenuItem value="regtest">Regtest</MenuItem>
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
                      isConnected && ordinalsAddress === xverseOrdinalsAddress
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
                              : feeEstimate?.currentBitcoinFees.minimum ||
                                "N/A"}{" "}
                            sats/vB)
                          </MenuItem>
                          <MenuItem value={FeeLevel.Low}>
                            Low (
                            {feeEstimateLoading
                              ? "..."
                              : feeEstimate?.currentBitcoinFees.hour ||
                                "N/A"}{" "}
                            sats/vB)
                          </MenuItem>
                          <MenuItem value={FeeLevel.Medium}>
                            Medium (
                            {feeEstimateLoading
                              ? "..."
                              : feeEstimate?.currentBitcoinFees.halfHour ||
                                "N/A"}{" "}
                            sats/vB)
                          </MenuItem>
                          <MenuItem value={FeeLevel.High}>
                            High (
                            {feeEstimateLoading
                              ? "..."
                              : feeEstimate?.currentBitcoinFees.fastest ||
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
              <Grid2 xs={12} sm={12} md={12}>
                <Dropzone onDrop={handleDrop} multiple>
                  {({ getRootProps, getInputProps }) => (
                    <Box
                      {...getRootProps()}
                      sx={{
                        width: "100%",
                        aspectRatio: "1/1",
                        border: "2px dashed #ccc",
                        borderRadius: 2,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        "&:hover": {
                          borderColor: "primary.main",
                          backgroundColor: "rgba(0, 0, 0, 0.04)",
                        },
                      }}
                    >
                      <input {...getInputProps()} />
                      <Typography
                        variant="body1"
                        textAlign="center"
                        sx={{ mb: 1 }}
                      >
                        Drag and drop some files here, or click to select files
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
