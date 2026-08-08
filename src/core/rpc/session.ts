// Session-Id management for Transmission RPC
// Handles 409 challenge-response and Basic auth

interface SessionConfig {
  rpcPath: string;
  username?: string;
  password?: string;
}

class Session {
  private sessionId: string = '';
  private rpcPath: string;
  private headers: Record<string, string> = {};

  constructor(config: SessionConfig) {
    this.rpcPath = config.rpcPath;
    if (config.username && config.password) {
      this.headers['Authorization'] =
        'Basic ' + btoa(config.username + ':' + config.password);
    }
  }

  setSessionId(id: string): void {
    this.sessionId = id;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getHeaders(): Record<string, string> {
    if (this.sessionId) {
      return {
        ...this.headers,
        'X-Transmission-Session-Id': this.sessionId,
      };
    }
    return { ...this.headers };
  }

  getRpcPath(): string {
    return this.rpcPath;
  }

  /**
   * Init session: send a POST to get Session-Id via 409 challenge.
   * Transmission returns 409 with X-Transmission-Session-Id header on first request.
   */
  async init(): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let response: Response;
    try {
      response = await fetch(this.rpcPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify({ method: 'session-get' }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.status === 409) {
      const sid = response.headers.get('X-Transmission-Session-Id');
      if (sid) {
        this.sessionId = sid;
        return;
      }
    }

    const sid = response.headers.get('X-Transmission-Session-Id');
    if (sid) {
      this.sessionId = sid;
    }
  }
}

let sessionInstance: Session | null = null;

export function createSession(config: SessionConfig): Session {
  sessionInstance = new Session(config);
  return sessionInstance;
}

export function getSession(): Session {
  if (!sessionInstance) {
    throw new Error('Session not initialized. Call createSession() first.');
  }
  return sessionInstance;
}

export type { Session, SessionConfig };
