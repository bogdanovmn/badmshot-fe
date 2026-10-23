import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import { AuthHttpClient, SsoService, tokenStorage } from '@bogdanovmn/ssofw'
import { handleAuthFailure } from '@/logout'

const apiUrl = import.meta.env.VITE_API_URL

export interface ApiError {
  message: string;
  status: number;
}

const DEFAULT_ERROR_MESSAGE = 'Что-то пошло не так. Попробуйте ещё раз.'

interface ErrorPayload {
  message?: unknown
  error?: unknown
  status?: unknown
  code?: unknown
}

function parseErrorPayload(value: string): ErrorPayload | null {
  const start = value.indexOf('{')
  if (start < 0) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(value.slice(start))
    return parsed && typeof parsed === 'object' ? parsed as ErrorPayload : null
  } catch {
    return null
  }
}

function readStatus(payload: ErrorPayload): number | undefined {
  if (typeof payload.code === 'number') {
    return payload.code
  }
  return typeof payload.status === 'number' ? payload.status : undefined
}

function readMessage(payload: ErrorPayload): string {
  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message.trim()
  }
  return typeof payload.error === 'string' ? payload.error.trim() : ''
}

function normalizeError(error: unknown): { message: string; status?: number } {
  let message = ''
  let status: number | undefined

  if (typeof error === 'string') {
    message = error
  } else if (error instanceof Error) {
    message = error.message
  } else if (error && typeof error === 'object') {
    const payload = error as ErrorPayload
    message = readMessage(payload)
    status = readStatus(payload)
  }

  message = message.trim()
  const payload = parseErrorPayload(message)
  if (payload) {
    const payloadMessage = readMessage(payload)
    if (payloadMessage) {
      message = payloadMessage
    }
    status = status ?? readStatus(payload)
  } else {
    message = message.replace(/^Request error:\s*/i, '').trim()
  }

  return { message, status }
}

export function getErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_ERROR_MESSAGE
): string {
  const { message, status } = normalizeError(error)

  if (/network error|failed to fetch|networkerror/i.test(message)) {
    return 'Нет связи с сервером. Проверьте подключение и попробуйте ещё раз.'
  }
  if (/timeout|timed out/i.test(message)) {
    return 'Сервер не ответил вовремя. Попробуйте ещё раз.'
  }
  if (!message || /^Unexpected API error$/i.test(message)) {
    if (status === 401) {
      return 'Требуется авторизация.'
    }
    if (status === 403) {
      return 'Недостаточно прав для этого действия.'
    }
    return fallback
  }

  return message
}

const handleApiError = (error: unknown): ApiError => {
  const responseError = (error as AxiosError<{ status: number; error: string; message: string }>).response?.data
  const normalized = normalizeError(error)
  return {
    message: responseError?.message || responseError?.error || normalized.message || DEFAULT_ERROR_MESSAGE,
    status: responseError?.status || normalized.status || 500,
  }
}

const ssoService = new SsoService(import.meta.env.VITE_SSO_SERVICE_URL)

export const authApi = new AuthHttpClient(
  apiUrl,
  ssoService,
  () => { handleAuthFailure(ssoService) }
)

export const makeApiRequest = async <T>(
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  params: Record<string, unknown> = {}
): Promise<T> => {
  try {
    if (tokenStorage.defined()) {
      return await authApi.makeRequest<T>({
        method,
        url,
        ...(method === 'get' || method === 'delete'
          ? { params }
          : { data: params }
        )
      });
    }
    const response: AxiosResponse<T> = await axios({
      method,
      url: `${apiUrl}${url}`,
      ...(method === 'get' || method === 'delete'
        ? { params }
        : { data: params }
      )
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error)
  }
};

export const apiBaseUrl = apiUrl
