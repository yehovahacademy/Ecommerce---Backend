
import jwt from "jsonwebtoken";
import {
  createRemoteJWKSet,
  jwtVerify,
} from "jose";

import { prisma } from "../config/prisma.js";

const KEYCLOAK_URL = process.env.KEYCLOAK_URL;
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM;
// Comma-separated lists, e.g. KEYCLOAK_CLIENT_IDS=ecommerce-admin,ecommerce-user
const csv = (value) =>
  (value || "").split(",").map((s) => s.trim()).filter(Boolean);
const KEYCLOAK_AUDIENCES = csv(process.env.KEYCLOAK_AUDIENCE);
const KEYCLOAK_CLIENT_IDS = csv(process.env.KEYCLOAK_CLIENT_IDS);

// Keycloak is optional: only enable it when it is configured,
// otherwise building the JWKS URL crashes the server at startup.
const KEYCLOAK_ISSUER =
  KEYCLOAK_URL && KEYCLOAK_REALM
    ? `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`
    : null;

const JWKS = KEYCLOAK_ISSUER
  ? createRemoteJWKSet(
      new URL(`${KEYCLOAK_ISSUER}/protocol/openid-connect/certs`)
    )
  : null;

// Verify a Keycloak access token: signature (realm's public keys), issuer and expiry.
// Then check it was meant for us. Keycloak access tokens usually carry
// aud: "account" unless an audience mapper is configured, and name the client
// in `azp` instead, so accept either a matching `aud` or a matching `azp`.
const verifyKeycloakToken = async (token) => {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: KEYCLOAK_ISSUER,
    algorithms: ["RS256"],
  });

  const tokenAudiences = [payload.aud ?? []].flat();
  const audienceOk = KEYCLOAK_AUDIENCES.some((a) => tokenAudiences.includes(a));
  const clientOk = KEYCLOAK_CLIENT_IDS.includes(payload.azp);

  if (!audienceOk && !clientOk) {
    throw new Error(
      `Keycloak token not issued for this API (aud=${JSON.stringify(payload.aud)}, azp=${payload.azp}). ` +
      `Add the client to KEYCLOAK_CLIENT_IDS or an audience mapper for KEYCLOAK_AUDIENCE.`
    );
  }

  return payload;
};

// Find or create the local ecommerce user
const getKeycloakUser = async (payload) => {
  const {
    sub,
    email,
    email_verified,
    name,
    preferred_username,
    picture,
    realm_access,
  } = payload;

  if (!sub || !email) {
    throw new Error("Keycloak token has no email (add the 'email' client scope)");
  }

  // Required because the account is linked to an existing user by email below.
  if (email_verified !== true) {
    throw new Error(
      `Keycloak email ${email} is not verified. In Keycloak: Users > ${email} > turn on "Email verified"`
    );
  }

  // Realm roles plus roles on the client that requested the token, any case.
  const keycloakRoles = [
    ...(realm_access?.roles || []),
    ...(payload.resource_access?.[payload.azp]?.roles || []),
  ].map((r) => String(r).toUpperCase());

  const role = keycloakRoles.includes("ADMIN")
    ? "ADMIN"
    : "USER";

  // First, search using Keycloak's unique user ID
  let user = await prisma.user.findUnique({
    where: {
      keycloakId: sub,
    },
  });

  if (user) {
    return prisma.user.update({
      where: { id: user.id },
      data: { role },
    });
  }

  // If the email already exists, safely link the verified identity
  user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (user) {
    if (user.keycloakId && user.keycloakId !== sub) {
      throw new Error("This email is linked to another Keycloak account");
    }

    return prisma.user.update({
      where: { id: user.id },
      data: {
        keycloakId: sub,
        role,
      },
    });
  }

  // Create a new local ecommerce user
  return prisma.user.create({
    data: {
      keycloakId: sub,
      name: name || preferred_username || email,
      email,
      avatarUrl: picture || null,
      role,
    },
  });
};

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authHeader.split(" ")[1];

    // Decode only to identify which verification method to use.
    // This decoded payload is NOT trusted for authentication.
    const unverifiedPayload = jwt.decode(token);

    if (
      KEYCLOAK_ISSUER &&
      unverifiedPayload?.iss === KEYCLOAK_ISSUER
    ) {
      // Keycloak authentication
      const payload = await verifyKeycloakToken(token);

      const user = await getKeycloakUser(payload);

      req.user = {
        id: user.id,
        role: user.role,
        email: user.email,
      };
    } else {
      // Existing application JWT authentication
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      req.user = {
        id: decoded.sub,
        role: decoded.role,
      };
    }

    return next();

  } catch (error) {
    console.error("AUTHENTICATION ERROR:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};
