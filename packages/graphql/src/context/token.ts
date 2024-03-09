export type TokenType = "bitcoin" | "ethereum";

export interface ITokenContext {
  getToken: (namespace?: string) => string | undefined;
  setToken: (token: string, namespace?: string) => void;
  clearToken: (namespace?: string) => void;
}
