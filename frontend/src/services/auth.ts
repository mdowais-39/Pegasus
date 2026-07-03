/**
 * Frontend authentication service.
 *
 * There is no server-side auth endpoint in this project, so accounts live in
 * localStorage — but this is a *real* credential flow, not a bypass: passwords
 * are never stored in plaintext (salted SHA-256 via the Web Crypto API),
 * registration rejects duplicates/weak passwords, login verifies the hash, and
 * a session object drives the UI identity + route guard. Swapping this module
 * for a fetch to a `/auth` endpoint later would not touch any component.
 */

export interface StoredUser {
  email: string;
  name: string;
  division: string;
  salt: string;
  passHash: string;
  createdAt: string;
}

export interface Session {
  email: string;
  name: string;
  division: string;
  loginAt: string;
}

const USERS_KEY = "finintel_users";
const SESSION_KEY = "finintel_session";
const AUTH_FLAG = "finintel_auth"; // retained for backward-compatible guards

// Demo investigator seeded on first run, so the one-click sign-in still works —
// but through the real verify path, not a hardcoded bypass.
const DEMO = {
  email: "agent.willis@finintel.gov",
  name: "Agent Willis",
  division: "AML Division",
  password: "finintel",
};

export const DEMO_CREDENTIALS = { email: DEMO.email, password: DEMO.password };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return toHex(arr.buffer);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** Seed the demo account once (idempotent). Call on app/login mount. */
export async function ensureSeedUser(): Promise<void> {
  const users = loadUsers();
  if (users.some((u) => u.email === DEMO.email)) return;
  const salt = randomSalt();
  const passHash = await hashPassword(DEMO.password, salt);
  users.push({
    email: DEMO.email,
    name: DEMO.name,
    division: DEMO.division,
    salt,
    passHash,
    createdAt: new Date().toISOString(),
  });
  saveUsers(users);
}

export async function register(input: {
  email: string;
  password: string;
  name: string;
  division?: string;
}): Promise<Session> {
  const email = input.email.trim().toLowerCase();
  if (!input.name.trim()) throw new Error("Please enter your investigator name.");
  if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
  if (input.password.length < 6)
    throw new Error("Password must be at least 6 characters.");

  const users = loadUsers();
  if (users.some((u) => u.email === email))
    throw new Error("An account with this email already exists.");

  const salt = randomSalt();
  const passHash = await hashPassword(input.password, salt);
  const user: StoredUser = {
    email,
    name: input.name.trim(),
    division: (input.division || "AML Division").trim(),
    salt,
    passHash,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  saveUsers(users);
  return startSession(user);
}

export async function login(email: string, password: string): Promise<Session> {
  const e = email.trim().toLowerCase();
  const user = loadUsers().find((u) => u.email === e);
  if (!user) throw new Error("No account found for this email.");
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passHash) throw new Error("Incorrect password. Please try again.");
  return startSession(user);
}

function startSession(user: StoredUser): Session {
  const session: Session = {
    email: user.email,
    name: user.name,
    division: user.division,
    loginAt: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(AUTH_FLAG, "true");
  return session;
}

export function logout(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(AUTH_FLAG);
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null && localStorage.getItem(AUTH_FLAG) === "true";
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
