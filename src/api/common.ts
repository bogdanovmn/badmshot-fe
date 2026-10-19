import axios from 'axios'
import type { AxiosError, AxiosResponse } from 'axios'
import { AuthHttpClient, SsoService } from '@bogdanovmn/ssofw'
import { handleAuthFailure } from '@/logout'

const apiUrl = import.meta.env.VITE_API_URL

export interface ApiError {
  message: string;
  status: number;
}

const handleApiError = (error: unknown): ApiError => {
  const responseError = (error as AxiosError<{ status: number; error: string; message: string }>).response?.data
  return {
    message: responseError?.message || responseError?.error || 'Unexpected API error',
    status: responseError?.status || 500,
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
