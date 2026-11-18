export interface AuthUser {
  id: number;
  email: string;
  name: string;
  roles: string[];
}

export interface JwtPayload {
  sub: number;
  email: string;
  roles: string[];
}
