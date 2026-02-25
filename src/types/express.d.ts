import { JWTPayload } from "./jwt.type.js";

declare global {
  namespace Express {
    export interface Request {
      user?: JWTPayload;
    }
  }
}
