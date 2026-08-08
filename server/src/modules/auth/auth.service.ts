import bcrypt from "bcryptjs";
import { User } from "@prisma/client";
import { prisma } from "../../prisma";
import { conflict, unauthorized } from "../../lib/http-error";
import { Role } from "../../domain";
import { LoginInput, RegisterInput } from "./auth.schemas";

const SALT_ROUNDS = 10;

// Public-safe representation of a user (never exposes the password hash).
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
  };
}

export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw conflict("An account with this email already exists");
  }
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
      role: "STUDENT",
    },
  });
  return toPublicUser(user);
}

export async function verifyCredentials(input: LoginInput): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Compare against a dummy hash when the user is missing to reduce timing signal.
  const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinva";
  const ok = await bcrypt.compare(input.password, hash);
  if (!user || !ok) {
    throw unauthorized("Invalid email or password");
  }
  return user;
}
