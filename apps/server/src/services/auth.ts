export interface AuthToken {
  accessToken: string;
  refreshToken: string;
}

export interface UserId {
  value: string;
}

export abstract class AuthService {
  abstract signUpWithEmailAndPassword(email: string, password: string): Promise<UserId>;
  abstract loginByEmailAndPassword(email: string, password: string): Promise<AuthToken>;
  abstract requestPasswordReset(email: string): Promise<void>;
  abstract resetPassword(resetToken: string, newPassword: string): Promise<void>;
  abstract logout(accessToken: string): Promise<void>;
  abstract logoutEverywhere(): Promise<void>;
}
