// import {
//   FC,
//   createContext,
//   PropsWithChildren,
//   useCallback,
//   useEffect,
//   useContext,
//   useMemo,
//   useState,
// } from "react";
// import { useNonce } from "./useNonce";
// import {
//   createJweRequest,
//   TAllowedAction,
//   Matcher,
//   verifyJwtForLogin,
// } from "@0xflick/ordinals-rbac-models";
// import { useSiweSignIn, useSiwbSignIn } from "./useSignIn";
// import { useSignOut } from "./useSignOut";
// import { useEnsAvatar, useEnsName, useSignMessage } from "wagmi";
// import { useSelf } from "./useSelf";
// import { graphQlAllowedActionToPermission } from "../transforms/allowedActions";
// import { useGetAppInfoQuery } from "./app.generated";
// import { Web3Namespace } from "@/graphql/types";

// function useAuthContext({ autoLogin = false }: { autoLogin?: boolean }) {
//   const [stateToken, setStateToken] = useState<string | null>(null);
//   const [roleIds, setRoleIds] = useState<string[]>([]);
//   const [siweReason, setSiweReason] = useState<
//     "LOGIN" | "SIGNUP" | "ADD_ADDRESS" | null
//   >(null);
//   const [state, setState] = useState<
//     | "ANONYMOUS"
//     | "REQUEST_SIGN_IN"
//     | "SIGNING_MESSAGE"
//     | "USER_MESSAGE_SIGNED"
//     | "AUTHENTICATED"
//     | "REQUEST_SIGN_OUT"
//   >("ANONYMOUS");
//   const isAnonymous = state === "ANONYMOUS";
//   const isAuthenticated = state === "AUTHENTICATED";
//   const {
//     currentChain,
//     activeConnector,
//     selectedAddress: address,
//     isConnected: isWeb3Connected,
//   } = useWeb3();
//   const { data: appInfoData } = useGetAppInfoQuery();
//   const pubKey = appInfoData?.appInfo?.pubKey;
//   const issuer = appInfoData?.appInfo?.name;

//   useEffect(() => {
//     if (autoLogin && isWeb3Connected && state === "ANONYMOUS") {
//       setState("REQUEST_SIGN_IN");
//     }
//   }, [autoLogin, isWeb3Connected, state]);

//   const { data: ensName, isLoading: ensNameIsLoading } = useEnsName({
//     address,
//     enabled: !!address,
//   });
//   const { data: ensAvatar, isLoading: ensAvatarIsLoading } = useEnsAvatar({
//     name: ensName,
//     enabled: !!address,
//   });

//   const isUserSigningMessage = state === "SIGNING_MESSAGE";
//   const isUserRequestingSignIn = state === "REQUEST_SIGN_IN";
//   const isUserSigningOut = state === "REQUEST_SIGN_OUT";

//   // const { data: signer } = useSigner({});
//   const [requestSignOut] = useSignOut();

//   const chainId = currentChain?.id;
//   const [
//     fetchNonce,
//     { data: nonceData, loading: nonceIsLoading, reset: nonceReset },
//   ] = useNonce();
//   const nonceIsSuccess = !!nonceData;
//   const messageToSign = nonceData?.nonceEthereum?.messageToSign;
//   const nonce = nonceData?.nonceEthereum?.nonce;

//   const [
//     fetchSiweToken,
//     {
//       data: siweTokenData,
//       error: siweTokenError,
//       loading: siweTokenIsLoading,
//       reset: siweTokenReset,
//     },
//   ] = useSiweSignIn();

//   const [
//     fetchSiwbToken,
//     {
//       data: siwbTokenData,
//       error: siwbTokenError,
//       loading: siwbTokenIsLoading,
//       reset: siwbTokenReset,
//     },
//   ] = useSiwbSignIn();

//   const tokenIsSuccess = !!(siweTokenData || siwbTokenData);
//   const tokenIsError = !!(siweTokenError || siwbTokenError);
//   const {
//     data: user,
//     isLoggedIn: userIsLoggedInToGraphql,
//     error: selfError,
//     refetch: refetchSelf,
//   } = useSelf({
//     namespace: Web3Namespace.Siwe,
//   });
//   useEffect(() => {
//     if (userIsLoggedInToGraphql && user?.token) {
//       setState("AUTHENTICATED");
//       setRoleIds(user.roleIds);
//       setStateToken(user.token);
//       refetchSelf();
//     } else if (selfError) {
//       setState("ANONYMOUS");
//       setRoleIds([]);
//       setStateToken(null);
//     }
//   }, [user, userIsLoggedInToGraphql, selfError, refetchSelf]);
//   const signIn = useCallback(() => {
//     setState("REQUEST_SIGN_IN");
//   }, []);

//   const signOut = useCallback(() => {
//     siweTokenReset();
//     siwbTokenReset();
//     nonceReset();
//     requestSignOut();
//     setState("ANONYMOUS");
//     setRoleIds([]);
//     setStateToken(null);
//   }, [siweTokenReset, siwbTokenReset, nonceReset, requestSignOut]);

//   useEffect(() => {
//     if (address && isUserRequestingSignIn && chainId) {
//       fetchNonce({ variables: { address, chainId } })
//         .then(() => {
//           setState("SIGNING_MESSAGE");
//         })
//         // TODO: toast
//         .catch((err) => {
//           console.error(err);
//           setState("ANONYMOUS");
//         });
//     }
//   }, [address, chainId, fetchNonce, isUserRequestingSignIn]);
//   const { signMessageAsync } = useSignMessage();

//   useEffect(() => {
//     if (tokenIsError) {
//       setState("ANONYMOUS");
//       setRoleIds([]);
//       setStateToken(null);
//     }
//   }, [tokenIsError]);
//   useEffect(() => {
//     if (
//       isUserSigningMessage &&
//       nonceIsSuccess &&
//       nonce &&
//       activeConnector &&
//       address &&
//       chainId &&
//       pubKey &&
//       messageToSign
//     ) {
//       signMessageAsync({
//         message: messageToSign,
//       }).then(
//         (signature: string) => {
//           setState("USER_MESSAGE_SIGNED");
//           createJweRequest({
//             signature,
//             nonce,
//             pubKeyStr: pubKey,
//           })
//             .then((jwe) => {
//               return fetchSiweToken({
//                 variables: {
//                   address,
//                   jwe,
//                 },
//               });
//             })
//             .catch((err) => {
//               // TODO: toast
//               console.error(err);
//               setState("ANONYMOUS");
//               setRoleIds([]);
//               setStateToken(null);
//             });
//         },
//         (err: Error) => {
//           console.error(err);
//           // FIXME: figure out rejection vs error vs wallet type
//           //TODO: toast;
//         }
//       );
//     }
//   }, [
//     nonceData,
//     nonceIsSuccess,
//     activeConnector,
//     address,
//     chainId,
//     messageToSign,
//     signMessageAsync,
//     isUserSigningMessage,
//     nonce,
//     pubKey,
//     fetchSiweToken,
//   ]);

//   // useEffect(() => {
//   //   if (
//   //     nonceIsSuccess &&
//   //     nonceData &&
//   //     tokenIsSuccess &&
//   //     siweTokenData &&
//   //     address &&
//   //     issuer
//   //   ) {
//   //     const token = siweTokenData.siwe?.data?.token;
//   //     const pubKey = nonceData?.nonceEthereum?.pubKey;
//   //     const authUser = siweTokenData.siwe?.data?.user;
//   //     if (!token || !pubKey) {
//   //       // TODO: toast
//   //       console.warn("No token returned from server");
//   //       setState("ANONYMOUS");
//   //       setRoleIds([]);
//   //       setStateToken(null);
//   //       return;
//   //     }
//   //     async function verifyToken() {
//   //       if (!token) {
//   //         setState("ANONYMOUS");
//   //         setRoleIds([]);
//   //         setStateToken(null);
//   //         return;
//   //       }
//   //       try {
//   //         switch (siweReason) {
//   //           case "LOGIN": {
//   //             setRoleIds(authUser.roleIds);
//   //             setStateToken(token);
//   //             setState("AUTHENTICATED");
//   //             refetchSelf();
//   //             break;
//   //           }
//   //           case "SIGNUP": {
//   //             await verifyJwtForNewUserCreation(token);
//   //             setStateToken(token);
//   //             setState("AUTHENTICATED");
//   //             refetchSelf();
//   //             break;
//   //           }
//   //           case "ADD_ADDRESS": {
//   //             if (address) {
//   //               await verifyJwtForAddressAddition(token, address);
//   //               setStateToken(token);
//   //               setState("AUTHENTICATED");
//   //               refetchSelf();
//   //             } else {
//   //               console.warn(`Unable to parse token for ${address}`);
//   //               // TODO: toast
//   //               setState("ANONYMOUS");
//   //               setRoleIds([]);
//   //               setStateToken(null);
//   //             }
//   //             break;
//   //           }
//   //           default:
//   //             console.warn(`Unable to parse token for ${address}`);
//   //             // TODO: toast
//   //             setState("ANONYMOUS");
//   //             setRoleIds([]);
//   //             setStateToken(null);
//   //         }
//   //       } catch (err) {
//   //         console.error(err);
//   //         // TODO: toast
//   //         setState("ANONYMOUS");
//   //         setRoleIds([]);
//   //         setStateToken(null);
//   //       }
//   //     }
//   //     verifyToken();
//   //   }
//   // }, [
//   //   address,
//   //   issuer,
//   //   nonceData,
//   //   nonceIsSuccess,
//   //   tokenIsSuccess,
//   //   refetchSelf,
//   //   siweTokenData,
//   //   siweReason,
//   // ]);
//   const setToken = useCallback(
//     async (token: string) => {
//       // decode token
//       if (!address || !issuer) {
//         console.warn("Unable to set token, no address or issuer");
//       }
//       const authUser = await verifyJwtForLogin(token);
//       if (authUser.roleIds.some((roleId) => roleId === `ADDRESS#${address}`)) {
//         setRoleIds(authUser.roleIds);
//         setStateToken(token);
//         setState("AUTHENTICATED");
//       } else {
//         console.warn(`Unable to parse token for ${address}`);
//         // TODO: toast
//         setState("ANONYMOUS");
//         setRoleIds([]);
//         setStateToken(null);
//       }
//     },
//     [address, issuer]
//   );
//   const result = {
//     isAuthenticated,
//     isAnonymous,
//     isUserRequestingSignIn,
//     isUserSigningMessage,
//     isUserWaiting: nonceIsLoading || siweTokenIsLoading || siwbTokenIsLoading,
//     isUserSigningOut,
//     token:
//       stateToken ||
//       siweTokenData?.siwe?.token ||
//       siwbTokenData?.siwb?.token ||
//       user?.token ||
//       undefined,
//     user,
//     roleIds,
//     allowedActions:
//       user?.allowedActions.map(graphQlAllowedActionToPermission) ?? [],
//     signIn,
//     signOut,
//     ensName,
//     ensNameIsLoading,
//     ensAvatar,
//     ensAvatarIsLoading,
//     setToken,
//   };
//   return result;
// }

// type TContext = ReturnType<typeof useAuthContext>;
// const AuthProvider = createContext<TContext | null>(null);

// export const Provider: FC<
//   PropsWithChildren<{
//     autoLogin?: boolean;
//   }>
// > = ({ autoLogin, children }) => {
//   const context = useAuthContext({
//     autoLogin,
//   });

//   return (
//     <AuthProvider.Provider value={context}>{children}</AuthProvider.Provider>
//   );
// };

// export function useAuth() {
//   const ctx = useContext(AuthProvider);
//   if (ctx === null) {
//     throw new Error("No context defined");
//   }
//   return ctx;
// }

// export function useHasAllowedAction(
//   permissionMatcher: Matcher<TAllowedAction[]>
// ) {
//   const { allowedActions } = useAuth();
//   return useMemo(() => {
//     if (allowedActions) {
//       return permissionMatcher(allowedActions);
//     }
//     return false;
//   }, [permissionMatcher, allowedActions]);
// }
