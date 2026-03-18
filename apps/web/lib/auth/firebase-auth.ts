import { env } from "@/lib/env";

type FirebasePasswordSignInSuccess = {
  localId: string;
  email: string;
  displayName?: string;
  idToken: string;
  registered: boolean;
};

type FirebasePasswordSignInError = {
  error?: {
    code?: number;
    message?: string;
  };
};

export class FirebasePasswordAuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "FirebasePasswordAuthError";
  }
}

function mapFirebaseError(code: string) {
  switch (code) {
    case "EMAIL_NOT_FOUND":
    case "INVALID_PASSWORD":
    case "INVALID_LOGIN_CREDENTIALS":
    case "USER_DISABLED":
      return "Kullanici adi veya sifre hatali.";
    case "TOO_MANY_ATTEMPTS_TRY_LATER":
      return "Cok fazla deneme yapildi. Lutfen daha sonra tekrar dene.";
    default:
      return "Firebase giris istegi basarisiz oldu.";
  }
}

export async function signInWithFirebaseEmailPassword(email: string, password: string) {
  if (!env.firebaseApiKey) {
    throw new FirebasePasswordAuthError(
      "Firebase Web API key tanimli degil.",
      "MISSING_FIREBASE_API_KEY",
    );
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.firebaseApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
      cache: "no-store",
    },
  );

  const payload = (await response.json()) as
    | FirebasePasswordSignInSuccess
    | FirebasePasswordSignInError;

  if (!response.ok) {
    const code = payload && "error" in payload ? payload.error?.message ?? "UNKNOWN" : "UNKNOWN";
    throw new FirebasePasswordAuthError(mapFirebaseError(code), code);
  }

  return payload as FirebasePasswordSignInSuccess;
}
