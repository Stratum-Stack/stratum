import { config } from 'dotenv'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// Find .env file relative to this file's location (go up 2 levels: config -> src -> root)
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '..', '.env')

config({ path: envPath })

export class Settings {
  private static instance: Settings

  private constructor() {
    this.validateRequiredEnvVars()
  }

  static getInstance(): Settings {
    if (!Settings.instance) {
      Settings.instance = new Settings()
    }
    return Settings.instance
  }

  get mongoUri(): string {
    return process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27017/app?authSource=admin'
  }

  get mongoDatabase(): string {
    return process.env.MONGODB_DATABASE || 'app'
  }

  get port(): number {
    return parseInt(process.env.PORT || '3000', 10)
  }

  get host(): string {
    return process.env.HOST || (this.isProduction ? '0.0.0.0' : 'localhost')
  }

  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development'
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development'
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production'
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test'
  }

  get jwtSecret(): string {
    return process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'
  }

  get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || '7d'
  }

  get logLevel(): string {
    return process.env.LOG_LEVEL || 'info'
  }

  get corsOrigin(): string[] {
    const origins = process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:3001'
    return origins.split(',').map(origin => origin.trim())
  }

  get apiBaseUrl(): string {
    return process.env.API_BASE_URL || `http://${this.host}:${this.port}`
  }

  get s3Region(): string {
    return process.env.S3_REGION || 'us-east-1'
  }

  get s3Bucket(): string {
    return process.env.S3_BUCKET || 'app-uploads'
  }

  get s3AccessKeyId(): string {
    return process.env.S3_ACCESS_KEY_ID || 'local-access-key'
  }

  get s3SecretAccessKey(): string {
    return process.env.S3_SECRET_ACCESS_KEY || 'local-secret-key'
  }

  get s3Endpoint(): string | null {
    return process.env.S3_ENDPOINT ?? null
  }

  get s3ForcePathStyle(): boolean {
    return (process.env.S3_FORCE_PATH_STYLE ?? 'false').toLowerCase() === 'true'
  }

  get s3PublicBaseUrl(): string | null {
    return process.env.S3_PUBLIC_BASE_URL ?? null
  }

  get s3BasePath(): string | null {
    return process.env.S3_BASE_PATH ?? null
  }

  get redisUri(): string {
    return process.env.REDIS_URI || 'redis://localhost:6379'
  }

  get telegramBotToken(): string {
    return process.env.TELEGRAM_BOT_TOKEN || ''
  }

  get telegramManagerChatId(): string | undefined {
    return process.env.TELEGRAM_MANAGER_CHAT_ID
  }

  get smtpHost(): string | undefined {
    return process.env.SMTP_HOST
  }

  get smtpPort(): number {
    return process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
  }

  get smtpUser(): string | undefined {
    return process.env.SMTP_USER
  }

  get smtpPassword(): string | undefined {
    return process.env.SMTP_PASSWORD
  }

  get smtpFrom(): string | undefined {
    return process.env.SMTP_FROM
  }

  get imapHost(): string | undefined {
    return process.env.IMAP_HOST
  }

  get imapPort(): number {
    return process.env.IMAP_PORT ? parseInt(process.env.IMAP_PORT, 10) : 993
  }

  get imapUser(): string | undefined {
    return process.env.IMAP_USER
  }

  get imapPassword(): string | undefined {
    return process.env.IMAP_PASSWORD
  }

  get imapSecure(): boolean {
    return (process.env.IMAP_SECURE ?? 'true').toLowerCase() === 'true'
  }

  get eventBus() {
    return {
      useRedis: (process.env.EVENT_BUS_USE_REDIS ?? 'true').toLowerCase() === 'true',
      enablePubSub: (process.env.EVENT_BUS_ENABLE_PUBSUB ?? 'true').toLowerCase() === 'true',
      channelPrefix: process.env.EVENT_BUS_CHANNEL_PREFIX ?? 'events:',
      gracefulDegradation: (process.env.EVENT_BUS_GRACEFUL_DEGRADATION ?? 'true').toLowerCase() === 'true',
    }
  }

  private validateRequiredEnvVars(): void {
    const requiredVars = ['MONGODB_URI', 'MONGODB_DATABASE']
    const missingVars: string[] = []

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missingVars.push(varName)
      }
    }

    if (missingVars.length > 0 && this.isProduction) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }
  }

  getConnectionString(): string {
    return this.mongoUri
  }

  getDatabaseName(): string {
    return this.mongoDatabase
  }

  getServerConfig() {
    return {
      host: this.host,
      port: this.port
    }
  }

  getJwtConfig() {
    return {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiresIn
    }
  }

  getCorsConfig() {
    return {
      origin: this.corsOrigin,
      credentials: true
    }
  }

  logConfig(): void {
    if (this.isDevelopment) {
      console.log('Application Configuration:')
      console.log(`- Environment: ${this.nodeEnv}`)
      console.log(`- Host: ${this.host}`)
      console.log(`- Port: ${this.port}`)
      console.log(`- Database: ${this.mongoDatabase}`)
      console.log(`- Log Level: ${this.logLevel}`)
      console.log(`- CORS Origins: ${this.corsOrigin.join(', ')}`)
    }
  }
}

export const settings = Settings.getInstance()
