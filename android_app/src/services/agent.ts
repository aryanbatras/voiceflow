import { BskyAgent } from '@atproto/api';
import { useAuthStore } from '@/store/auth-store';

let agentInstance: BskyAgent | null = null;

export function getAgent(): BskyAgent {
  if (!agentInstance) {
    agentInstance = new BskyAgent({ service: 'https://bsky.social' });
  }
  return agentInstance;
}

export async function resumeSession(): Promise<boolean> {
  const { session } = useAuthStore.getState();
  if (!session) return false;

  try {
    const agent = getAgent();
    const res = await agent.resumeSession({
      did: session.did,
      handle: session.handle,
      accessJwt: session.accessJwt,
      refreshJwt: session.refreshJwt,
      active: session.active ?? true,
    });

    if (res.success) {
      useAuthStore.getState().setSession({
        did: agent.session!.did,
        handle: agent.session!.handle,
        accessJwt: agent.session!.accessJwt,
        refreshJwt: agent.session!.refreshJwt,
        active: agent.session!.active,
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function login(identifier: string, password: string): Promise<boolean> {
  try {
    const agent = getAgent();
    await agent.login({ identifier, password });

    if (agent.session) {
      useAuthStore.getState().setSession({
        did: agent.session.did,
        handle: agent.session.handle,
        accessJwt: agent.session.accessJwt,
        refreshJwt: agent.session.refreshJwt,
        active: agent.session.active,
      });
      return true;
    }
    return false;
  } catch (error: any) {
    useAuthStore.getState().setError(error?.message || 'Login failed');
    return false;
  }
}

export async function logout(): Promise<void> {
  agentInstance = null;
  useAuthStore.getState().clearSession();
}
