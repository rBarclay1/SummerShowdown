"use server"

// Admin login is no longer used — authentication is handled by Clerk.
// These stubs prevent import errors from any leftover references.

export async function adminLogin(): Promise<{ error: string }> {
  return { error: "Admin login is no longer used. Please sign in with Clerk." }
}

export async function adminLogout() {
  // No-op — sign out is handled by Clerk's UserButton
}
