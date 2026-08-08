import { beforeEach, describe, expect, it } from "vitest";
import { app, createUser, request, resetDb, PASSWORD } from "./helpers";

describe("Auth", () => {
  beforeEach(resetDb);

  it("registers a valid student and returns a token (no password hash)", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "New Student", email: "new@example.com", password: PASSWORD })
      .expect(201);

    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.email).toBe("new@example.com");
    expect(res.body.user.role).toBe("STUDENT");
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  it("rejects duplicate email with 409", async () => {
    await createUser({ email: "dupe@example.com" });
    await request(app)
      .post("/auth/register")
      .send({ name: "Dupe", email: "dupe@example.com", password: PASSWORD })
      .expect(409);
  });

  it("rejects weak/invalid input with 422", async () => {
    await request(app)
      .post("/auth/register")
      .send({ name: "", email: "not-an-email", password: "short" })
      .expect(422);
  });

  it("logs in with valid credentials", async () => {
    await createUser({ email: "login@example.com" });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "login@example.com", password: PASSWORD })
      .expect(200);
    expect(res.body.token).toBeTypeOf("string");
  });

  it("rejects invalid credentials with 401", async () => {
    await createUser({ email: "login2@example.com" });
    await request(app)
      .post("/auth/login")
      .send({ email: "login2@example.com", password: "wrong-password" })
      .expect(401);
  });

  it("returns the current user from /auth/me for both roles", async () => {
    await createUser({ email: "mentor@example.com", role: "MENTOR" });
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "mentor@example.com", password: PASSWORD })
      .expect(200);
    const me = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${res.body.token}`)
      .expect(200);
    expect(me.body.user.role).toBe("MENTOR");
  });
});
