export type CreateRealtimeTokenInput = {
  clientId: string;
};

export type RealtimeTokenRequest = {
  keyName: string;
  ttl?: number;
  timestamp: number;
  capability: string;
  clientId?: string;
  nonce: string;
  mac: string;
};

export interface RealtimeProvider {
  createTokenRequest(
    input: CreateRealtimeTokenInput,
  ): Promise<RealtimeTokenRequest>;
}
