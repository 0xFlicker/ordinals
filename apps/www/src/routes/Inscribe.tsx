"use client";
import { FC, useCallback, useState } from "react";
import { DefaultProvider } from "@/context/default";
import Grid2 from "@mui/material/Unstable_Grid2";
import { SwitchableNetwork } from "@/layouts/SwitchableNetwork";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import TextField from "@mui/material/TextField";
import { Pay } from "@/features/inscription";
import { AddressPurpose, BitcoinNetworkType } from "sats-connect";
import { AutoConnect } from "@/features/web3";
import Dropzone from "react-dropzone";
import { useCreateCollectionWithUpload } from "@/features/collections/hooks/useCreateCollectionWithUpload";
import { useSignMultipartUpload } from "@/features/inscribe/hooks/useSignMultipartUpload";
import { useCreateCollectionParentInscription } from "@/features/collections/hooks/useCreateCollectionParentInscription";
import { BitcoinNetwork, FeeLevel } from "@/graphql/types";
import { useRouter } from "next/navigation";
import { InscribeError, InscribeErrorTotalFileSizeTooLarge, useInscribe } from "@/features/inscribe/hooks/useInscribe";
import { useXverse } from "@/features/xverse";

export const Inscribe: FC<{
  initialBitcoinNetwork: BitcoinNetworkType;
  initialBitcoinPurpose: AddressPurpose;
}> = ({ initialBitcoinNetwork, initialBitcoinPurpose }) => {
  const router = useRouter();
  const [inscribeError, setInscribeError] = useState<InscribeError | null>(null);
  const [name, setName] = useState<string>("");
  const { address, network } = useXverse();
  

    const {
      handleCreate,
      paymentRequest,
    } = useInscribe({
      network,
      destinationAddress: address,
      feeLevel: FeeLevel.Medium,
      feePerByte: 10,
    })

    const handleDrop = useCallback((files: File[]) => {
      try {
        handleCreate(files);
      } catch (error: unknown) {
        if (error instanceof InscribeError) {
          setInscribeError(error);
        } else {
          throw error;
        }
      }
    }, [handleCreate]);

  return (
    <>
      <Grid2 container spacing={2} sx={{ mt: 10 }}>
        
        {paymentRequest ? (
          <Grid2 xs={12} sm={12} md={12}>
            <Pay fundingId={paymentRequest.id} network={paymentRequest.network} />
          </Grid2>
        ) : <Grid2 xs={12} sm={12} md={12}>
          <Dropzone onDrop={handleDrop} multiple>
            {({ getRootProps, getInputProps }) => (
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                <p>Drag and drop some files here, or click to select files</p>
                {inscribeError && (
                  <p>{inscribeError.message}</p>
                )}
              </div>
            )}
          </Dropzone>
        </Grid2>}
      </Grid2>
    </>
  );
};
