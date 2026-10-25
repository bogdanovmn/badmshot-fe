import { tokenStorage } from '@bogdanovmn/ssofw'
import { apiBaseUrl, authApi, getErrorMessage, makeApiRequest } from './common'

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
  edgePixelate: boolean
  edgePixelStrength: number
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
  shares: number
  comments: number
  lastCommentAt: string | null
  liked: boolean
  views: number
}

export interface ScreenshotComment {
  id: string
  screenshotId: string
  author: string
  text: string
  createdAt: string
}

export interface SharedFrame {
  token: string
  views: number
  createdAt: string
  card: ScreenshotCard
}

export interface PublicSharedFrame {
  token: string
  screenshotId: string
  timecodeSeconds: number
  imageFormat: string
  width: number
  height: number
  createdAt: string
  year: number | null
  month: number | null
  matchDate: string | null
  clubName: string | null
  tournament: boolean
  players: string[]
  likes: number
  shares: number
  comments: number
  liked: boolean
  views: number
  shareViews: number
}

export interface UserFrameFilter {
  playerIds: string[]
  clubIds: string[]
  includeIndi: boolean
  updatedAt: string | null
}

export type ArchiveType = 'GAMES' | 'INDI'

export interface ScreenshotFilter {
  players?: string[]
  clubs?: string[]
  indi?: boolean
}

export interface FrameRateLimitStatus {
  minSecondsBetweenFrames: number
  freeFrames: number
  freeFramesLeft: number
  retryAfterSeconds: number
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
  type: ArchiveType
  relPath: string
  year: number | null
  month: number | null
  matchDate: string | null
  clubId: string | null
  clubName: string | null
  tournament: boolean
  group: string | null
  comment: string | null
  durationSeconds: number | null
  sizeMbytes: number
  validationError: string | null
  players: string[]
  fileName: string
  valid: boolean
}

export interface Match {
  id: string
  type: ArchiveType
  relPath: string
  year: number | null
  month: number | null
  matchDate: string | null
  clubId: string | null
  clubName: string | null
  tournament: boolean
  group: string | null
  comment: string | null
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
  matched: number
}

export interface ArchiveYear {
  year: number
  matches: number
  invalid: number
  matched: number
  months: ArchiveMonth[]
}

export interface ArchiveSessionFile {
  id: string
  relPath: string
  players: string[]
  sizeMbytes: number
  durationSeconds: number | null
  screenshots: number
  validationError: string | null
  comment: string | null
}

export interface ArchiveSession {
  id: string
  type: ArchiveType
  name: string
  matchDate: string
  year: number
  month: number
  clubId: string | null
  club: string | null
  clubName: string | null
  tournament: boolean
  group: string | null
  matches: number
  sizeMbytes: number
  durationSeconds: number
  invalid: number
  comment: string | null
  exportable: boolean
  files: ArchiveSessionFile[]
}

export interface ArchiveSessions {
  year: number | null
  month: number | null
  sessions: ArchiveSession[]
}

export interface ArchiveCapabilities {
  exportEnabled: boolean
  importEnabled: boolean
  indexEnabled: boolean
  readOnly: boolean
}

export interface SessionsQuery {
  year?: number
  month?: number
  clubId?: string
  playerId?: string
  type?: ArchiveType
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
  screenshotBytesTotal: number
  screenshotBytesAverage: number
  screenshotBytesMax: number
  fileName: string | null
  sessionName: string | null
  cancelRequested: boolean
  error: string | null
  startedAt: string
  lastActivityAt: string
  finishedAt: string | null
  durationSeconds: number
  lastActivitySecondsAgo: number
}

export interface IndexDefaults {
  screenshotsCount: number
  marginSeconds: number
  scalePercent: number
  quality: number
  threads: number
  player: string
  format: ScreenshotFormat
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
  type?: ArchiveType
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

export async function getTeaserScreenshots(): Promise<ScreenshotCard[]> {
  return makeApiRequest<ScreenshotCard[]>('get', '/screenshots/teaser')
}

export async function getRandomScreenshot(): Promise<ScreenshotCard> {
  return authApi.get<ScreenshotCard>('/screenshots/random')
}

export async function getScreenshotCard(id: string): Promise<ScreenshotCard> {
  return authApi.get<ScreenshotCard>(`/screenshots/${id}`)
}

export async function getNextScreenshot(filter: ScreenshotFilter = {}): Promise<ScreenshotCard> {
  return authApi.get<ScreenshotCard>(appendQuery('/screenshots/next', filter))
}

export async function getFrameRateLimit(): Promise<FrameRateLimitStatus> {
  return authApi.get<FrameRateLimitStatus>('/screenshots/rate-limit')
}

export async function registerScreenshotView(id: string): Promise<void> {
  await authApi.post(`/screenshots/${id}/view`)
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

export async function getCommentedScreenshots(): Promise<ScreenshotCard[]> {
  return authApi.get<ScreenshotCard[]>('/screenshots/commented')
}

export async function getMyCommentedScreenshots(): Promise<ScreenshotCard[]> {
  return authApi.get<ScreenshotCard[]>('/screenshots/mine/comments')
}

export async function getMyShares(): Promise<SharedFrame[]> {
  return authApi.get<SharedFrame[]>('/screenshots/mine/shares')
}

export async function createScreenshotShare(id: string): Promise<{ token: string }> {
  return authApi.post<{ token: string }>(`/screenshots/${id}/share`)
}

export async function getScreenshotComments(id: string): Promise<ScreenshotComment[]> {
  return authApi.get<ScreenshotComment[]>(`/screenshots/${id}/comments`)
}

export async function addScreenshotComment(id: string, text: string): Promise<ScreenshotComment> {
  return authApi.post<ScreenshotComment>(`/screenshots/${id}/comments`, { text })
}

export async function getPublicSharedFrame(token: string): Promise<PublicSharedFrame> {
  return makeApiRequest<PublicSharedFrame>('get', `/shares/${token}`)
}

export async function registerSharedFrameView(token: string): Promise<void> {
  await makeApiRequest('post', `/shares/${token}/view`)
}

export function sharedScreenshotUrl(token: string, width: number): string {
  return `${apiBaseUrl}/shares/${token}/crop/${width}`
}

export async function getDefaultFrameFilter(): Promise<UserFrameFilter> {
  return authApi.get<UserFrameFilter>('/profile/filters')
}

export async function saveDefaultFrameFilter(
  filter: Pick<UserFrameFilter, 'playerIds' | 'clubIds' | 'includeIndi'>
): Promise<UserFrameFilter> {
  return authApi.put<UserFrameFilter>('/profile/filters', filter)
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

export async function screenshotImageUrl(id: string, width: number): Promise<string> {
  const directUrl = screenshotUrl(id, width)
  if (!tokenStorage.defined()) {
    return directUrl
  }
  try {
    const blob = await authApi.makeRequest<Blob>({
      method: 'GET',
      url: `/screenshots/${id}/crop/${width}`,
      responseType: 'blob'
    })
    return URL.createObjectURL(blob)
  } catch {
    return directUrl
  }
}

export async function getClubs(params: { playerId?: string } = {}): Promise<Club[]> {
  return makeApiRequest<Club[]>('get', '/filters/clubs', params)
}

export async function getPlayers(params: { clubId?: string; term?: string } = {}): Promise<Player[]> {
  return makeApiRequest<Player[]>('get', '/filters/players', params)
}

export async function getPlayerLetters(): Promise<string[]> {
  return makeApiRequest<string[]>('get', '/filters/players/letters')
}

export async function getPlayersByLetter(letter: string): Promise<Player[]> {
  return makeApiRequest<Player[]>('get', '/filters/players', { letter })
}

export async function getPlayersByIds(ids: string[]): Promise<Player[]> {
  if (ids.length === 0) {
    return []
  }
  return makeApiRequest<Player[]>('get', appendValues('/filters/players/by-ids', 'ids', ids))
}

export async function getClubsByIds(ids: string[]): Promise<Club[]> {
  if (ids.length === 0) {
    return []
  }
  return makeApiRequest<Club[]>('get', appendValues('/filters/clubs/by-ids', 'ids', ids))
}

function appendValues(url: string, key: string, values: string[]): string {
  const search = new URLSearchParams()
  values.forEach(value => search.append(key, value))
  return `${url}?${search.toString()}`
}

export async function getPlayerTags(type: ArchiveType = 'GAMES'): Promise<CatalogTag[]> {
  return makeApiRequest<CatalogTag[]>('get', '/tags/players', { type })
}

export async function getClubTags(type: ArchiveType = 'GAMES'): Promise<CatalogTag[]> {
  return makeApiRequest<CatalogTag[]>('get', '/tags/clubs', { type })
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

export async function getArchiveTree(
  type: ArchiveType = 'GAMES',
  playerId?: string
): Promise<ArchiveYear[]> {
  return authApi.get<ArchiveYear[]>('/archive/tree', { type, playerId })
}

export async function getArchiveCapabilities(): Promise<ArchiveCapabilities> {
  return authApi.get<ArchiveCapabilities>('/archive/capabilities')
}

export async function getArchiveSessions(query: SessionsQuery = {}): Promise<ArchiveSessions> {
  return authApi.get<ArchiveSessions>('/archive/sessions', query)
}

export async function exportSession(id: string): Promise<Blob> {
  return authApi.makeRequest<Blob>({
    method: 'GET',
    url: `/archive/sessions/${id}/export`,
    responseType: 'blob'
  })
}

export async function startImportJob(file: File): Promise<JobResponse> {
  const data = new FormData()
  data.append('file', file)
  return authApi.post<JobResponse>('/archive/import', data)
}

export async function getImportJob(): Promise<JobResponse | null> {
  const response = await authApi.get<JobResponse | ''>('/archive/import')
  return response || null
}

export async function getImportJobs(limit = 20): Promise<JobResponse[]> {
  return authApi.get<JobResponse[]>('/archive/import/history', { limit })
}

export async function cancelImportJob(): Promise<void> {
  await authApi.delete('/archive/import')
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

export async function getArchiveStats(type: ArchiveType = 'GAMES'): Promise<ArchiveStats> {
  return authApi.get<ArchiveStats>('/archive/stats', { type })
}

export async function getIndexJob(): Promise<JobResponse | null> {
  const response = await authApi.get<JobResponse | ''>('/archive/index-job')
  return response || null
}

export async function getIndexDefaults(): Promise<IndexDefaults> {
  return authApi.get<IndexDefaults>('/archive/index-job/defaults')
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

export function isNotFound(error: unknown): boolean {
  if (error instanceof Error) {
    return /"code":\s*404/.test(error.message)
  }
  return typeof error === 'object'
    && error !== null
    && 'status' in error
    && Number((error as { status: unknown }).status) === 404
}

export { apiBaseUrl, authApi, getErrorMessage, makeApiRequest }
