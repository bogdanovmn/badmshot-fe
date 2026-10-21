import { apiBaseUrl, authApi, makeApiRequest } from './common'

export interface AppVersion {
  version: string
}

export interface FrameEffectSettings {
  halftone: boolean
  halftoneStrength: number
  blur: boolean
  blurStrength: number
  pixelate: boolean
  pixelStrength: number
  pixelColors: number
  transitionEnabled: boolean
  transitionDuration: number
  transitionPixels: number
}

export interface Club {
  id: string
  name: string
  displayName: string | null
  displayLabel: string
}

export interface PlayerAlias {
  id: string
  name: string
  displayName: string | null
  displayLabel: string
}

export interface Player {
  id: string
  name: string
  displayName: string | null
  aliasOfPlayerId: string | null
  alias: PlayerAlias | null
  displayLabel: string
}

export interface ScreenshotCard {
  id: string
  matchId: string
  timecodeSeconds: number
  imageFormat: string
  width: number
  height: number
  createdAt: string
  year: number | null
  month: number | null
  matchDate: string | null
  clubId: string | null
  clubName: string | null
  tournament: boolean
  players: string[]
  likes: number
  liked: boolean
}

export interface ScreenshotFilter {
  players?: string[]
  clubs?: string[]
  excludeMatchId?: string
  excludeClubId?: string
}

export interface CatalogTag {
  id: string
  label: string
  matches: number
}

export interface Screenshot {
  id: string
  matchId: string
  timecodeSeconds: number
  imageFormat: string
  width: number
  height: number
  createdAt: string
}

export interface MatchBrief {
  id: string
  relPath: string
  year: number | null
  month: number | null
  matchDate: string | null
  clubId: string | null
  clubName: string | null
  tournament: boolean
  durationSeconds: number | null
  sizeMbytes: number
  validationError: string | null
  players: string[]
  fileName: string
  valid: boolean
}

export interface Match {
  id: string
  relPath: string
  year: number | null
  month: number | null
  matchDate: string | null
  clubId: string | null
  clubName: string | null
  tournament: boolean
  durationSeconds: number | null
  sizeMbytes: number
  validationError: string | null
  indexedAt: string | null
  valid: boolean
}

export interface MatchPage {
  total: number
  items: MatchBrief[]
}

export interface MatchDetail {
  match: Match
  players: Player[]
  screenshots: Screenshot[]
}

export interface ArchiveMonth {
  month: number
  matches: number
  invalid: number
}

export interface ArchiveYear {
  year: number
  matches: number
  invalid: number
  months: ArchiveMonth[]
}

export interface ArchiveMonthStat {
  month: number
  matches: number
  sizeMbytes: number
  durationSeconds: number
}

export interface ArchiveYearStat {
  year: number
  matches: number
  sizeMbytes: number
  durationSeconds: number
  months: ArchiveMonthStat[]
}

export interface CatalogStat {
  id: string
  name: string
  matches: number
  sizeMbytes: number
  durationSeconds: number
}

export interface ArchiveStats {
  matches: number
  sizeMbytes: number
  durationSeconds: number
  screenshotCount: number
  screenshotSizeMbytes: number
  years: ArchiveYearStat[]
  clubs: CatalogStat[]
  players: CatalogStat[]
}

export interface JobResponse {
  id: string
  type: string
  status: string
  phase: string | null
  totalFiles: number
  processedFiles: number
  screenshotsCreated: number
  cancelRequested: boolean
  error: string | null
  startedAt: string
  lastActivityAt: string
  finishedAt: string | null
}

export type ArchiveJobMode = 'META' | 'SCREENSHOTS'

export type ScreenshotFormat = 'jpeg' | 'webp'

export interface IndexOptions {
  mode?: ArchiveJobMode
  screenshotsCount?: number
  marginSeconds?: number
  scalePercent?: number
  quality?: number
  threads?: number
  player?: string
  format?: ScreenshotFormat
}

export interface MatchesQuery {
  year?: number
  month?: number
  clubId?: string
  playerId?: string
  invalid?: boolean
  limit?: number
  offset?: number
}

export async function getBackendVersion(): Promise<AppVersion> {
  return makeApiRequest<AppVersion>('get', '/version')
}

export async function getFrameEffectSettings(): Promise<FrameEffectSettings> {
  return makeApiRequest<FrameEffectSettings>('get', '/frame-effects')
}

export async function saveFrameEffectSettings(settings: FrameEffectSettings): Promise<void> {
  await authApi.put('/frame-effects', settings)
}

export async function getRandomScreenshot(filter: ScreenshotFilter = {}): Promise<ScreenshotCard> {
  return makeApiRequest<ScreenshotCard>('get', appendQuery('/screenshots/random', filter))
}

export async function getNextScreenshot(filter: ScreenshotFilter = {}): Promise<ScreenshotCard> {
  return authApi.get<ScreenshotCard>(appendQuery('/screenshots/next', filter))
}

function appendQuery(url: string, params: ScreenshotFilter): string {
  const search = new URLSearchParams()
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    if (Array.isArray(value)) {
      value.forEach(item => search.append(key, String(item)))
    } else {
      search.append(key, String(value))
    }
  })
  const query = search.toString()
  return query ? `${url}?${query}` : url
}

export async function getTopScreenshots(): Promise<ScreenshotCard[]> {
  return makeApiRequest<ScreenshotCard[]>('get', '/screenshots/top')
}

export async function getLikedScreenshots(): Promise<ScreenshotCard[]> {
  return authApi.get<ScreenshotCard[]>('/screenshots/liked')
}

export async function likeScreenshot(id: string): Promise<void> {
  await authApi.post(`/screenshots/${id}/like`)
}

export async function unlikeScreenshot(id: string): Promise<void> {
  await authApi.delete(`/screenshots/${id}/like`)
}

export function screenshotUrl(id: string, width: number): string {
  return `${apiBaseUrl}/screenshots/${id}/crop/${width}`
}

export async function getClubs(params: { playerId?: string } = {}): Promise<Club[]> {
  return makeApiRequest<Club[]>('get', '/filters/clubs', params)
}

export async function getPlayers(params: { clubId?: string; term?: string } = {}): Promise<Player[]> {
  return makeApiRequest<Player[]>('get', '/filters/players', params)
}

export async function getPlayersByIds(ids: string[]): Promise<Player[]> {
  if (ids.length === 0) {
    return []
  }
  return makeApiRequest<Player[]>('get', '/filters/players/by-ids', { ids })
}

export async function getClubsByIds(ids: string[]): Promise<Club[]> {
  if (ids.length === 0) {
    return []
  }
  return makeApiRequest<Club[]>('get', '/filters/clubs/by-ids', { ids })
}

export async function getPlayerTags(): Promise<CatalogTag[]> {
  return makeApiRequest<CatalogTag[]>('get', '/tags/players')
}

export async function getClubTags(): Promise<CatalogTag[]> {
  return makeApiRequest<CatalogTag[]>('get', '/tags/clubs')
}

export async function updatePlayer(
  id: string,
  data: { displayName?: string | null; aliasPlayerId?: string | null }
): Promise<void> {
  await authApi.put(`/players/${id}`, data)
}

export async function getAdminClubs(): Promise<Club[]> {
  return authApi.get<Club[]>('/clubs')
}

export async function updateClub(id: string, displayName: string | null): Promise<void> {
  await authApi.put(`/clubs/${id}`, { displayName })
}

export async function getArchiveTree(): Promise<ArchiveYear[]> {
  return authApi.get<ArchiveYear[]>('/archive/tree')
}

export async function getMatches(query: MatchesQuery = {}): Promise<MatchPage> {
  return authApi.get<MatchPage>('/archive/matches', query)
}

export async function getInvalidMatches(limit = 50, offset = 0): Promise<MatchPage> {
  return authApi.get<MatchPage>('/archive/invalid', { limit, offset })
}

export async function getMatch(id: string): Promise<MatchDetail> {
  return authApi.get<MatchDetail>(`/archive/matches/${id}`)
}

export async function renameMatch(id: string, players: string[]): Promise<MatchBrief> {
  return authApi.post<MatchBrief>(`/archive/matches/${id}/rename`, { players })
}

export async function getArchiveStats(): Promise<ArchiveStats> {
  return authApi.get<ArchiveStats>('/archive/stats')
}

export async function getIndexJob(): Promise<JobResponse | null> {
  const response = await authApi.get<JobResponse | ''>('/archive/index-job')
  return response || null
}

export async function startIndexJob(options: IndexOptions = {}): Promise<JobResponse> {
  return authApi.post<JobResponse>('/archive/index-job', options)
}

export async function cancelIndexJob(): Promise<void> {
  await authApi.delete('/archive/index-job')
}

export function isRateLimited(error: unknown): boolean {
  return error instanceof Error && /"code":\s*429/.test(error.message)
}

export { apiBaseUrl, authApi, makeApiRequest }
