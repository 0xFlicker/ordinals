import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  IUserAddress,
  TAllowedAction,
  TPermission,
  IUser,
  IUserWithAddresses,
  IUserWithRoles,
} from "@0xflick/ordinals-rbac-models";

export type AuthStatus =
  | "idle"
  | "verifyingAddress"
  | "anonVerified"
  | "signingIn"
  | "authenticated"
  | "addingAddress"
  | "error";

// Represent the three possible sign-in outcomes
export type SignInType = "EXISTING_USER" | "NEW_USER" | "LINKED_USER_REQUEST";

export interface AuthState {
  status: AuthStatus;

  // stored tokens for various flows
  anonVerifyToken?: string; // for NEW_USER
  addressAddToken?: string; // for LINKED_USER_REQUEST
  currentToken?: string; // last received JWE/JWT

  // outcome flags
  isRealUser: boolean; // EXISTING_USER
  isAnonUser: boolean; // NEW_USER
  isLinking: boolean; // LINKED_USER_REQUEST

  // when fully authenticated
  userId?: string;
  handle?: string;
  roles: string[];
  addresses: IUserAddress[];
  allowedActions: TAllowedAction[];
  permissions: TPermission[];

  isLoading: boolean;
  error: string | null;
}

export const initialState: AuthState = {
  status: "idle",
  roles: [],
  addresses: [],
  allowedActions: [],
  permissions: [],

  isRealUser: false,
  isAnonUser: false,
  isLinking: false,

  isLoading: false,
  error: null,
};

export type TUser =
  | IUser
  | IUserWithAddresses
  | IUserWithRoles
  | { allowedActions: TAllowedAction[]; permissions: TPermission[] };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // --- Phase 1: initial address verify (optional) ---
    verifyAddressRequested(state) {
      state.status = "verifyingAddress";
      state.isLoading = true;
      state.error = null;
      // clear previous tokens
      state.anonVerifyToken = undefined;
      state.addressAddToken = undefined;
    },
    verifyAddressSucceeded(
      state,
      action: PayloadAction<{
        anonVerifyToken: string;
        addresses: IUserAddress[];
      }>
    ) {
      state.anonVerifyToken = action.payload.anonVerifyToken;
      state.addresses = action.payload.addresses;
      state.status = "anonVerified";
      state.isLoading = false;
      state.isAnonUser = true;
    },
    verifyAddressFailed(state, action: PayloadAction<string>) {
      state.status = "error";
      state.isLoading = false;
      state.error = action.payload;
    },

    // --- Phase 2: unified sign-in flow ---
    signInRequested(state) {
      state.status = "signingIn";
      state.isLoading = true;
      state.error = null;
      // reset outcome flags
      state.isRealUser = false;
      state.isAnonUser = false;
      state.isLinking = false;
      state.currentToken = undefined;
      state.anonVerifyToken = undefined;
      state.addressAddToken = undefined;
    },
    signInSucceeded(
      state,
      action: PayloadAction<{
        type: SignInType;
        token: string;
        user?: TUser;
      }>
    ) {
      const { type, token, user } = action.payload;
      state.currentToken = token;
      state.isLoading = false;

      switch (type) {
        case "EXISTING_USER":
          if (!user) break;
          // populate full user
          state.roles = "roleIds" in user ? user.roleIds : [];
          state.addresses = "addresses" in user ? user.addresses : [];
          state.allowedActions =
            "allowedActions" in user ? user.allowedActions : [];
          state.permissions = "permissions" in user ? user.permissions : [];
          state.userId = "userId" in user ? user.userId : undefined;
          state.handle = "handle" in user ? user.handle : undefined;

          state.isRealUser = true;
          state.status = "authenticated";
          break;

        case "NEW_USER":
          // store ephemeral anon token
          state.anonVerifyToken = token;
          state.isAnonUser = true;
          state.status = "anonVerified";
          break;

        case "LINKED_USER_REQUEST":
          // store ephemeral link token
          state.addressAddToken = token;
          state.isLinking = true;
          state.status = "addingAddress";
          break;
      }
    },
    signInFailed(state, action: PayloadAction<string>) {
      state.status = "error";
      state.isLoading = false;
      state.error = action.payload;
    },

    // --- Phase 3: link address final ---
    addAddressConfirmed(state, action: PayloadAction<TUser>) {
      // reuse existing authSucceeded logic
      const user = action.payload;
      state.roles = "roleIds" in user ? user.roleIds : [];
      state.addresses = "addresses" in user ? user.addresses : [];
      state.allowedActions =
        "allowedActions" in user ? user.allowedActions : [];
      state.permissions = "permissions" in user ? user.permissions : [];
      state.userId = "userId" in user ? user.userId : undefined;
      state.handle = "handle" in user ? user.handle : undefined;

      state.status = "authenticated";
      state.isRealUser = true;
    },

    // --- Phase 4: rehydrate from session ---
    userRequested(state) {
      state.status = "idle";
      state.isLoading = true;
      state.error = null;
    },
    userAccepted(state, action: PayloadAction<TUser>) {
      const payload = action.payload;
      state.roles = "roleIds" in payload ? payload.roleIds : [];
      state.addresses = "addresses" in payload ? payload.addresses : [];
      state.allowedActions =
        "allowedActions" in payload ? payload.allowedActions : [];
      state.permissions = "permissions" in payload ? payload.permissions : [];
      state.userId = "userId" in payload ? payload.userId : undefined;
      state.handle = "handle" in payload ? payload.handle : undefined;

      state.status = "authenticated";
      state.isRealUser = true;
      state.isLoading = false;
      state.error = null;
    },
    userRejected(state, action: PayloadAction<string>) {
      state.status = "error";
      state.isLoading = false;
      state.error = action.payload;
    },
  },
});

export const actions = authSlice.actions;
export const reducer = authSlice.reducer;
