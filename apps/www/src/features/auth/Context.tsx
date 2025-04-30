import { createContext, useReducer, useContext } from "react";
import { initialState, reducer } from "./ducks";
import { useAuthImpl } from "./ContextImpl";
import { TFullUser } from "@/utils/transforms";
type AuthContextState = ReturnType<typeof useAuthImpl>;

export const AuthContext = createContext<AuthContextState | null>(null);

export const AuthProvider = ({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: TFullUser;
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const auth = useAuthImpl({ state, dispatch, user });

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const response = useContext(AuthContext);
  if (!response) {
    throw new Error("AuthContext not found");
  }
  return response;
};
