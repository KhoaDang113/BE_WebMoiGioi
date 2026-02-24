import { JWT_ACCESS_EXPIRE, JWT_REFRESH_EXPIRE, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET } from "../contants/jwtContants.js"
import type { JWTPayload } from "../types/jwt.type.js"
import jwt, { type Secret } from "jsonwebtoken"
import ms from "ms"


export const generateAccessToken = (payload: JWTPayload): string => {
    return jwt.sign(
      {...payload, type: "access"},
      JWT_ACCESS_SECRET! as Secret,
      { expiresIn: JWT_ACCESS_EXPIRE as ms.StringValue},
    );
}

export const generateRefreshToken = (payload: JWTPayload): string => {
    return jwt.sign(
      {...payload, type: "refresh"},
      JWT_REFRESH_SECRET! as Secret,
      { expiresIn: JWT_REFRESH_EXPIRE as ms.StringValue},
    );
}

export const verifyAccessToken = (token: string): JWTPayload => {
    return jwt.verify(token, JWT_ACCESS_SECRET! as Secret) as JWTPayload;
}

export const verifyRefreshToken = (token: string): JWTPayload => {
    return jwt.verify(token, JWT_REFRESH_SECRET! as Secret) as JWTPayload;
}
