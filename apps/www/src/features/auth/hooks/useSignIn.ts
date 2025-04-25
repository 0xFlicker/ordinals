import {
  useWeb3SiweSignInMutation,
  useWeb3SiwbSignInMutation,
} from "./signin.generated";

export const useSiweSignIn = () => {
  const response = useWeb3SiweSignInMutation();

  return response;
};

export const useSiwbSignIn = () => {
  const response = useWeb3SiwbSignInMutation();

  return response;
};
