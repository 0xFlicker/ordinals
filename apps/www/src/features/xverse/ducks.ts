import { createAction, createReducer } from "@reduxjs/toolkit";
import {
  AddressPurpose,
  BitcoinNetwork,
  BitcoinNetworkType,
} from "sats-connect";

export interface INetworkTarget {
  network: BitcoinNetwork["type"];
  purpose: AddressPurpose[];
}

export enum AsyncStatus {
  IDLE = "idle",
  PENDING = "pending",
  FULFILLED = "fulfilled",
  REJECTED = "rejected",
}

export interface XverseState {
  paymentAddress?: string;
  paymentPublicKey?: string;
  ordinalsAddress?: string;
  ordinalsPublicKey?: string;
  errorMessage?: string;
  connectionStatus: AsyncStatus;
  signatureStatus?: AsyncStatus;
  signature?: string;
  currentTarget: INetworkTarget;
  verifiedOrdinalsAddress?: string;
}
export const initialState: XverseState = {
  connectionStatus: AsyncStatus.IDLE,
  currentTarget: {
    network: BitcoinNetworkType.Testnet,
    purpose: [AddressPurpose.Ordinals, AddressPurpose.Payment],
  },
};
const connectInit = createAction("xverse/connect");
const connectFulfilled = createAction(
  "xverse/connect/fulfilled",
  ({
    paymentAddress,
    paymentPublicKey,
    ordinalsAddress,
    ordinalsPublicKey,
  }: {
    paymentAddress: string;
    paymentPublicKey: string;
    ordinalsAddress: string;
    ordinalsPublicKey: string;
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
  "xverse/connect/rejected",
  (errorMessage: string) => ({
    payload: {
      errorMessage,
    },
  })
);
const signatureRequestInit = createAction("xverse/signatureRequest");
const signatureRequestFulfilled = createAction(
  "xverse/signatureRequest/fulfilled",
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
  "xverse/signatureRequest/rejected",
  (errorMessage: string) => ({
    payload: {
      errorMessage,
    },
  })
);
const switchTarget = createAction(
  "xverse/switchTarget",
  ({ network, purpose }: INetworkTarget) => ({
    payload: {
      network,
      purpose,
    },
  })
);

const setVerifiedOrdinalsAddress = createAction(
  "xverse/setVerifiedOrdinalsAddress",
  (ordinalsAddress: string) => ({
    payload: {
      ordinalsAddress,
    },
  })
);

export const xverseReducer = createReducer<XverseState>(
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
    builder.addCase(switchTarget, (state, action) => {
      state.currentTarget = action.payload;
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
  switchTarget,
  setVerifiedOrdinalsAddress,
};
