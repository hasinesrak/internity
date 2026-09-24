import { SignJWT, jwtVerify } from "jose"

import { getEnv } from "../config/env.js"
import { AppError } from "./errors.js"

function secret(): Uint8Array {
  return new TextEncoder().encode(getEnv().jwtSecret)
}

export async function signSession(user: {
  id: string
  tokenVersion: number
}): Promise<string> {
  const env = getEnv()
  return new SignJWT({ ver: user.tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("internity")
    .setAudience("internity-api")
    .setIssuedAt()
    .setExpirationTime(`${env.jwtMaxAgeSeconds}s`)
    .sign(secret())
}

export async function readSession(token: string): Promise<{
  userId: string
  tokenVersion: number
}> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: "internity",
      audience: "internity-api",
    })
    if (!payload.sub || typeof payload.ver !== "number") {
      throw new Error("incomplete session")
    }
    return { userId: payload.sub, tokenVersion: payload.ver }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.")
  }
}
