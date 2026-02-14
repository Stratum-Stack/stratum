import mongoose from 'mongoose'

export class MongoConnection {
  private static instance: MongoConnection
  private db: mongoose.Mongoose | null = null

  private constructor() {}

  static getInstance(): MongoConnection {
    if (!MongoConnection.instance) {
      MongoConnection.instance = new MongoConnection()
    }
    return MongoConnection.instance
  }

  async connect(uri: string, dbName: string): Promise<void> {
    try {
      this.db = await mongoose.connect(uri, {
        dbName,

        // Connection pool settings
        maxPoolSize: 10, // Maximum number of connections in the pool
        minPoolSize: 2, // Minimum number of connections to maintain

        // Socket settings to prevent timeouts
        socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        connectTimeoutMS: 10000, // 10 seconds to establish connection

        // Server selection timeout
        serverSelectionTimeoutMS: 10000, // 10 seconds to select a server

        // Heartbeat settings
        heartbeatFrequencyMS: 10000, // Check connection every 10 seconds

        // Retry settings
        retryWrites: true,
        retryReads: true,
      })
      console.log(`Connected to MongoDB database: ${dbName}`)
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.disconnect()
      this.db = null
      console.log('Disconnected from MongoDB')
    }
  }

  getDb(): mongoose.Mongoose {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.db
  }

  async ping(): Promise<boolean> {
    try {
      if (!this.db || !this.db.connection.db) return false
      await this.db.connection.db.admin().ping()
      return true
    } catch {
      return false
    }
  }
}

export const mongoConnection = MongoConnection.getInstance()

export async function initializeDatabase(): Promise<mongoose.Mongoose> {
  const { settings } = await import('../../config/settings')

  await mongoConnection.connect(settings.mongoUri, settings.mongoDatabase)
  return mongoConnection.getDb()
}

export function getDatabase(): mongoose.Mongoose {
  return mongoConnection.getDb()
}
