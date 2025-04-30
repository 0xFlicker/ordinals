import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import {
  IUser,
  IUserAddress,
  IUserWithAddresses,
  IUserWithRoles,
  TAllowedAction,
  TPermission,
} from "@0xflick/ordinals-rbac-models";

interface AuthState {
  userId?: string;
  handle?: string;
  allowedActions: TAllowedAction[];
  roles: string[];
  addresses: IUserAddress[];
  permissions: TPermission[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
}

export const initialState: AuthState = {
  isLoading: true,
  error: null,
  isLoaded: false,
  allowedActions: [],
  roles: [],
  addresses: [],
  permissions: [],
};

export type TUser =
  | IUser
  | IUserWithAddresses
  | IUserWithRoles
  | {
      allowedActions: TAllowedAction[];
      permissions: TPermission[];
    };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    userAccepted(state, action: PayloadAction<TUser>) {
      state.roles = "roleIds" in action.payload ? action.payload.roleIds : [];
      state.addresses =
        "addresses" in action.payload ? action.payload.addresses : [];
      state.allowedActions =
        "allowedActions" in action.payload ? action.payload.allowedActions : [];
      state.permissions =
        "permissions" in action.payload ? action.payload.permissions : [];
      state.userId =
        "userId" in action.payload ? action.payload.userId : undefined;
      state.handle =
        "handle" in action.payload ? action.payload.handle : undefined;
      state.isLoaded = true;
      state.isLoading = false;
      state.error = null;
    },
    userRejected(state, action: PayloadAction<string>) {
      state.isLoading = false;
      state.error = action.payload;
    },
    userRequested(state) {
      state.isLoaded = false;
      state.isLoading = true;
      state.error = null;
    },
  },
});

export const actions = authSlice.actions;

export const reducer = authSlice.reducer;
