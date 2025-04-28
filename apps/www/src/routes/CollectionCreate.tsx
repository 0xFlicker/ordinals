"use client";
import { FC, useCallback, useState } from "react";
import { DefaultProvider } from "@/context/default";
import Grid from "@mui/material/Grid";
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
import { BitcoinNetwork } from "@/graphql/types";
import { useRouter } from "next/navigation";

export const CollectionCreate: FC<{
  initialBitcoinNetwork: BitcoinNetworkType;
  initialBitcoinPurpose: AddressPurpose[];
}> = ({ initialBitcoinNetwork, initialBitcoinPurpose }) => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [maxSupply, setMaxSupply] = useState(0);
  const [collectionId, setCollectionId] = useState<string | null>(null);
  const [createCollectionWithUpload, { loading, error }] =
    useCreateCollectionWithUpload();
  const [
    signMultipartUpload,
    { loading: signMultipartUploadLoading, error: signMultipartUploadError },
  ] = useSignMultipartUpload();
  const handleDrop = useCallback(([acceptedFile]: File[]) => {
    setFile(acceptedFile);
  }, []);
  const [
    createCollectionParentInscription,
    {
      loading: createCollectionParentInscriptionLoading,
      error: createCollectionParentInscriptionError,
    },
  ] = useCreateCollectionParentInscription();

  const handleCreate = useCallback(async () => {
    if (!file) return;
    const fileName = file.name;
    const fileType = file.type;
    const { data } = await createCollectionWithUpload({
      variables: {
        input: {
          name,
          meta: JSON.stringify({
            description,
          }),
          parentInscription: {
            parentInscriptionContentType: fileType,
            parentInscriptionFileName: fileName,
          },
        },
      },
    });
    if (data?.createCollection?.id) {
      setCollectionId(data.createCollection.id);
    }
    if (data?.createCollection?.parentInscription?.uploadUrl) {
      const uploadUrl = data.createCollection.parentInscription.uploadUrl;
      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to upload file");
      }
      createCollectionParentInscription({
        variables: {
          bitcoinNetwork: BitcoinNetwork.Mainnet,
          collectionId: data.createCollection.id,
        },
      }).then((response) => {
        if (!response.data?.createCollectionParentInscription.id) {
          throw new Error("Failed to create parent inscription");
        }
        router.push(
          `/pay/${response.data.createCollectionParentInscription.id}`
        );
      });
    }
  }, [
    file,
    createCollectionWithUpload,
    name,
    description,
    createCollectionParentInscription,
    router,
  ]);
  return (
    <>
      <Grid container spacing={2} sx={{ mt: 10 }} columns={12}>
        <Grid size={12}>
          <TextField
            label="Collection Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Collection Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Grid>
        <Grid size={12}>
          <TextField
            label="Max Supply"
            value={maxSupply}
            onChange={(e) => setMaxSupply(Number(e.target.value))}
          />
        </Grid>
        <Grid size={12}>
          <FormGroup>
            <FormControlLabel
              control={<Checkbox />}
              label="Create Collection"
            />
            <Checkbox
              checked={file !== null}
              onChange={(e) => setFile(e.target.checked ? file : null)}
              disabled={!file}
            />
          </FormGroup>
          <Dropzone onDrop={handleDrop} multiple={false}>
            {({ getRootProps, getInputProps }) => (
              <div {...getRootProps()}>
                <input {...getInputProps()} />
                <p>Drag and drop some files here, or click to select files</p>
              </div>
            )}
          </Dropzone>
        </Grid>
        <Grid size={12}>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={loading}
          >
            Create Collection
          </button>
        </Grid>
      </Grid>
    </>
  );
};
