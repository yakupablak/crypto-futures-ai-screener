import { env, hasFirebaseAdminConfig } from "@/lib/env";

import { FirestoreRepository } from "./firestore-repository";
import { MockRepository } from "./mock-store";

export function getRepository() {
  if (!env.enableMockData && hasFirebaseAdminConfig()) {
    return new FirestoreRepository();
  }

  return new MockRepository();
}
