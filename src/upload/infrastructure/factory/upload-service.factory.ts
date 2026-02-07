import { type Mongoose } from 'mongoose'
import { UploadService } from '@application/services/upload.service'
import { UploadRepoMongoAdapter } from '@infrastructure/adapters/repositories/upload-repo-mongo.adapter'
import { S3UploadAdapter } from '@infrastructure/adapters/s3-upload.adapter'
import { type EventBusPort } from '@application/ports/event-bus.port'

export type UploadServiceFactoryConfig = {
  s3Bucket: string
  s3Region: string
  s3AccessKeyId: string
  s3SecretAccessKey: string
  s3Endpoint?: string
  s3ForcePathStyle: boolean
  s3PublicBaseUrl?: string
  s3BasePath?: string
}

export class UploadServiceFactory {
  static create(
    mongoClient: Mongoose,
    eventBus: EventBusPort,
    config: UploadServiceFactoryConfig
  ) {
    const uploadRepo = new UploadRepoMongoAdapter(mongoClient)

    const uploadAdapter = new S3UploadAdapter({
      bucket: config.s3Bucket,
      region: config.s3Region,
      credentials: {
        accessKeyId: config.s3AccessKeyId,
        secretAccessKey: config.s3SecretAccessKey,
      },
      endpoint: config.s3Endpoint,
      forcePathStyle: config.s3ForcePathStyle,
      publicBaseUrl: config.s3PublicBaseUrl,
      basePath: config.s3BasePath,
    })

    return new UploadService(eventBus, uploadAdapter, uploadRepo)
  }
}
