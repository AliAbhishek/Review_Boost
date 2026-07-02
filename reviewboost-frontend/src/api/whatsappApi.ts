import client from './client'

type Wrapped<T> = { status: string; data: T }

export interface WAStatus {
  status: 'not_initialized' | 'connecting' | 'connected' | 'disconnected'
  qrDataUrl: string | null
}

export const whatsappApi = {
  getStatus: () =>
    client
      .get<Wrapped<WAStatus>>('/api/whatsapp/status')
      .then((r) => r.data.data),

  connect: () =>
    client
      .post<Wrapped<WAStatus>>('/api/whatsapp/connect')
      .then((r) => r.data.data),

  disconnect: () =>
    client.delete('/api/whatsapp/disconnect'),
}
