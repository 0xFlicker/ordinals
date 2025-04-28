import { createAction, createReducer } from "@reduxjs/toolkit";
import {
  AddressPurpose,
  BitcoinNetwork,
  BitcoinNetworkType,
} from "sats-connect";

export enum AsyncStatus {
  IDLE = "idle",
  PENDING = "pending",
  FULFILLED = "fulfilled",
  REJECTED = "rejected",
}

export interface MagicEdenState {
  paymentAddress?: string;
  paymentPublicKey?: string;
  ordinalsAddress?: string;
  ordinalsPublicKey?: string;
  errorMessage?: string;
  connectionStatus: AsyncStatus;
  signatureStatus?: AsyncStatus;
  signature?: string;
  network: BitcoinNetwork["type"];
  purpose: AddressPurpose[];
  verifiedOrdinalsAddress?: string;
}

export const initialState: MagicEdenState = {
  connectionStatus: AsyncStatus.IDLE,
  network: BitcoinNetworkType.Mainnet,
  purpose: [AddressPurpose.Ordinals, AddressPurpose.Payment],
};

const connectInit = createAction("magicEden/connect");
const connectFulfilled = createAction(
  "magicEden/connect/fulfilled",
  ({
    paymentAddress,
    paymentPublicKey,
    ordinalsAddress,
    ordinalsPublicKey,
  }: {
    paymentAddress?: string;
    paymentPublicKey?: string;
    ordinalsAddress?: string;
    ordinalsPublicKey?: string;
  }) => ({
    payload: {
      paymentAddress,
      paymentPublicKey,
      ordinalsAddress,
      ordinalsPublicKey,
    },
  })
);
const connectRejected = createAction(
  "magicEden/connect/rejected",
  (errorMessage: string) => ({
    payload: {
      errorMessage,
    },
  })
);

const signatureRequestInit = createAction("magicEden/signatureRequest");
const signatureRequestFulfilled = createAction(
  "magicEden/signatureRequest/fulfilled",
  ({
    signature,
    ordinalsAddress,
  }: {
    signature: string;
    ordinalsAddress?: string;
  }) => ({
    payload: {
      signature,
      ordinalsAddress,
    },
  })
);
const signatureRequestRejected = createAction(
  "magicEden/signatureRequest/rejected",
  (errorMessage: string) => ({
    payload: {
      errorMessage,
    },
  })
);

const setNetwork = createAction(
  "magicEden/setNetwork",
  (network: BitcoinNetwork["type"]) => ({
    payload: {
      network,
    },
  })
);

const setPurpose = createAction(
  "magicEden/setPurpose",
  (purpose: AddressPurpose[]) => ({
    payload: {
      purpose,
    },
  })
);

const setVerifiedOrdinalsAddress = createAction(
  "magicEden/setVerifiedOrdinalsAddress",
  (ordinalsAddress: string) => ({
    payload: {
      ordinalsAddress,
    },
  })
);

export const magicEdenReducer = createReducer<MagicEdenState>(
  initialState,
  (builder) => {
    builder.addCase(connectInit, (state) => {
      state.connectionStatus = AsyncStatus.PENDING;
    });
    builder.addCase(connectFulfilled, (state, action) => {
      state.connectionStatus = AsyncStatus.FULFILLED;
      state.paymentAddress = action.payload.paymentAddress;
      state.paymentPublicKey = action.payload.paymentPublicKey;
      state.ordinalsAddress = action.payload.ordinalsAddress;
      state.ordinalsPublicKey = action.payload.ordinalsPublicKey;
    });
    builder.addCase(connectRejected, (state, action) => {
      state.connectionStatus = AsyncStatus.REJECTED;
      state.errorMessage = action.payload.errorMessage;
      state.paymentAddress = undefined;
      state.paymentPublicKey = undefined;
      state.ordinalsAddress = undefined;
      state.ordinalsPublicKey = undefined;
      state.verifiedOrdinalsAddress = undefined;
    });
    builder.addCase(signatureRequestInit, (state) => {
      state.signatureStatus = AsyncStatus.PENDING;
    });
    builder.addCase(signatureRequestFulfilled, (state, action) => {
      state.signatureStatus = AsyncStatus.FULFILLED;
      state.signature = action.payload.signature;
      if (action.payload.ordinalsAddress) {
        state.verifiedOrdinalsAddress = action.payload.ordinalsAddress;
      }
    });
    builder.addCase(signatureRequestRejected, (state, action) => {
      state.signatureStatus = AsyncStatus.REJECTED;
      state.errorMessage = action.payload.errorMessage;
    });
    builder.addCase(setNetwork, (state, action) => {
      state.network = action.payload.network;
    });
    builder.addCase(setPurpose, (state, action) => {
      state.purpose = action.payload.purpose;
    });
    builder.addCase(setVerifiedOrdinalsAddress, (state, action) => {
      state.verifiedOrdinalsAddress = action.payload.ordinalsAddress;
    });
  }
);

export const actionCreators = {
  connectInit,
  connectFulfilled,
  connectRejected,
  signatureRequestInit,
  signatureRequestFulfilled,
  signatureRequestRejected,
  setNetwork,
  setPurpose,
  setVerifiedOrdinalsAddress,
};
