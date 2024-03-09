import Button from "@mui/material/Button";
import { useXverse } from "./Context";
import { AsyncStatus } from "./ducks";
import { useBitcoinNonceMutation } from "./graphql/nonce.generated";
import { FC, useCallback } from "react";

export const Connect: FC<{}> = () => {
  const {
    connect,
    state: { connectionStatus, ordinalsPublicKey, ordinalsAddress },
    address,
  } = useXverse();
  const [
    fetchNonce,
    { loading: fetchingNonce, error: nonceError, data: nonceData },
  ] = useBitcoinNonceMutation({
    variables: {
      address: address ?? "",
    },
  });

  const onClick = useCallback(async () => {
    const { ordinalsAddress, ordinalsPublicKey } = await connect({
      message: "Connect to Xverse",
    });
    if (ordinalsAddress) {
      const { data } = await fetchNonce({
        variables: {
          address: ordinalsAddress,
        },
      });
      if (!data) {
        return console.warn("No nonce data");
      }
      const {
        nonceBitcoin: { messageToSign, nonce },
      } = data;
    }
  }, [connect, fetchNonce]);
  return (
    <>
      <Button variant="contained" color="primary" onClick={onClick}>
        {connectionStatus === AsyncStatus.FULFILLED ? "Connected" : "Connect"}
      </Button>
    </>
  );
};
