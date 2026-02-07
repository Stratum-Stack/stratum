import { randomUUID } from 'crypto'
import { S3Client, type S3ClientConfig, DeleteObjectCommand, PutObjectCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand, HeadObjectCommand, ListObjectsV2Command, CopyObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Upload } from '@aws-sdk/lib-storage'
import {
  type UploadAdapterPort,
  type UploadResult
} from '@application/ports/upload-adapter.port'
import { PresignedUrl } from '@domain/value-objects/presigned-url.value-object'

export type S3UploadAdapterConfig = {
  bucket: string
  region: string
  basePath?: string
  forcePathStyle?: boolean
  publicBaseUrl?: string
} & Pick<S3ClientConfig, 'credentials' | 'endpoint'>

export class S3UploadAdapter implements UploadAdapterPort {
  private readonly client: S3Client
  private bucketEnsured: boolean = false

  constructor(private readonly config: S3UploadAdapterConfig) {
    console.log('[S3UploadAdapter] Config:', {
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      bucket: config.bucket,
    })

    this.client = new S3Client({
      region: config.region,
      credentials: config.credentials,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
    })
  }

  private async ensureBucketExists(): Promise<void> {
    if (this.bucketEnsured) {
      return
    }

    try {
      // Check if bucket exists
      await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }))
      console.log(`[S3UploadAdapter] Bucket '${this.config.bucket}' already exists`)
      this.bucketEnsured = true
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        // Bucket doesn't exist, create it
        console.log(`[S3UploadAdapter] Creating bucket '${this.config.bucket}'...`)
        try {
          await this.client.send(new CreateBucketCommand({ Bucket: this.config.bucket }))
          console.log(`[S3UploadAdapter] Bucket '${this.config.bucket}' created successfully`)
          this.bucketEnsured = true
        } catch (createError: any) {
          console.error(`[S3UploadAdapter] Failed to create bucket:`, createError)
          throw createError
        }
      } else {
        // Some other error occurred
        console.error('[S3UploadAdapter] Error checking bucket existence:', error)
        throw error
      }
    }
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    })

    await this.client.send(command)
  }

  async generatePresignedUrl(key: string, fileId: string, expiresIn: number = 3600): Promise<PresignedUrl> {
    await this.ensureBucketExists()

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Metadata: {
        'id': fileId, // Store file ID in S3 metadata
      },
    })

    const url = await getSignedUrl(this.client, command, { expiresIn })
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    return new PresignedUrl(url, expiresAt)
  }

  async generateDownloadUrl(key: string, expiresIn: number = 3600): Promise<PresignedUrl> {
    await this.ensureBucketExists()

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    })

    const url = await getSignedUrl(this.client, command, { expiresIn })
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    return new PresignedUrl(url, expiresAt)
  }

  getPublicUrl(key: string): string {
    if (this.config.publicBaseUrl) {
      const cleanKey = key.startsWith('/') ? key.substring(1) : key
      return `${this.config.publicBaseUrl.replace(/\/$/, '')}/${cleanKey}`
    }

    // Fallback to S3 URL format
    if (this.config.forcePathStyle || this.config.endpoint) {
      const endpoint = this.config.endpoint || `https://s3.${this.config.region}.amazonaws.com`
      return `${endpoint}/${this.config.bucket}/${key}`
    }

    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`
  }

  async getFileMetadata(key: string): Promise<UploadResult | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      })

      const response = await this.client.send(command)

      // Extract ID from S3 metadata
      const id = response.Metadata?.['id'] || response.Metadata?.['ID']
      if (!id) {
        // File doesn't have ID in metadata (legacy file), skip it
        return null
      }

      return {
        id,
        key,
        size: response.ContentLength || 0,
        mimeType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified ?? new Date(),
      }
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return null
      }
      throw error
    }
  }

  async listFiles(prefix?: string): Promise<UploadResult[]> {
    await this.ensureBucketExists()

    const command = new ListObjectsV2Command({
      Bucket: this.config.bucket,
      Prefix: prefix || this.config.basePath,
    })

    const response = await this.client.send(command)
    const files: UploadResult[] = []

    if (response.Contents) {
      for (const item of response.Contents) {
        if (!item.Key) continue

        // Get metadata for each file to get content type and ID
        const metadata = await this.getFileMetadata(item.Key)
        if (metadata) {
          files.push(metadata)
        }
      }
    }

    return files
  }

  async uploadFile(file: File, prefix?: string): Promise<UploadResult> {
    await this.ensureBucketExists()

    const originalName = file.name || 'unknown'
    const mimeType = file.type || 'application/octet-stream'
    const key = this.buildObjectKey(originalName, prefix)
    const buffer = Buffer.from(await file.arrayBuffer())

    return await this.uploadBuffer({
      key,
      mimeType,
      buffer,
    })
  }

  async uploadFileFromUrl(url: string, prefix?: string): Promise<UploadResult> {
    await this.ensureBucketExists()

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch file from URL: ${url}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const originalName = this.inferFileName(url)
    const mimeType = response.headers.get('content-type') || 'application/octet-stream'
    const key = this.buildObjectKey(originalName, prefix)

    return await this.uploadBuffer({
      key,
      mimeType,
      buffer,
    })
  }

  private async uploadBuffer(params: {
    key: string
    mimeType: string
    buffer: Buffer
  }): Promise<UploadResult> {
    const fileId = randomUUID()

    await this.uploadToS3({
      Key: params.key,
      Body: params.buffer,
      ContentType: params.mimeType,
      Metadata: {
        'id': fileId, // Store file ID in S3 metadata
      },
    })

    return {
      id: fileId,
      key: params.key,
      size: params.buffer.byteLength,
      mimeType: params.mimeType,
      lastModified: new Date(),
    }
  }

  private async uploadToS3(params: {
    Key: string
    Body: Buffer
    ContentType: string
    Metadata?: Record<string, string>
  }): Promise<void> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.config.bucket,
        Key: params.Key,
        Body: params.Body,
        ContentType: params.ContentType,
        Metadata: params.Metadata,
        ACL: 'public-read',
      },
    })

    await upload.done()
  }

  private buildObjectKey(originalName: string, prefix?: string): string {
    const cleanName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const key = `${randomUUID()}-${cleanName}`

    // Build path: basePath/prefix/key
    const parts: string[] = []

    if (this.config.basePath) {
      parts.push(this.trimSlashes(this.config.basePath))
    }

    if (prefix) {
      parts.push(this.trimSlashes(prefix))
    }

    parts.push(key)

    return parts.join('/')
  }

  private inferFileName(url: string): string {
    try {
      const { pathname } = new URL(url)
      const fileName = pathname.split('/').filter(Boolean).pop()
      return fileName ?? `${randomUUID()}`
    } catch {
      return randomUUID()
    }
  }

  private trimSlashes(value: string): string {
    return value.replace(/^\/+/, '').replace(/\/+$/, '')
  }

  async renameFile(oldKey: string, newKey: string): Promise<void> {
    await this.ensureBucketExists()

    // Copy object to new key
    await this.client.send(new CopyObjectCommand({
      Bucket: this.config.bucket,
      CopySource: `${this.config.bucket}/${oldKey}`,
      Key: newKey,
    }))

    // Delete old object
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: oldKey,
    }))
  }
}
