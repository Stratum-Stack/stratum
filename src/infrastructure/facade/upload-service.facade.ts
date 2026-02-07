import { type UploadServicePort } from '@upload/application/ports/upload-service.port'
import { UploadServiceFactory } from '@upload/infrastructure/factory/upload-service.factory'
import { EventBusFacade } from './event-bus.facade'
import { mongoConnection } from '@/infrastructure/adapters/mongo'
import { settings } from '@config/settings'

export class UploadServiceFacade {
  private static instance: UploadServicePort

  static getInstance(): UploadServicePort {
    if (!UploadServiceFacade.instance) {
      UploadServiceFacade.instance = UploadServiceFactory.create(
        mongoConnection.getDb(),
        EventBusFacade.getInstanceSync(),
        {
          s3Bucket: settings.s3Bucket,
          s3Region: settings.s3Region,
          s3AccessKeyId: settings.s3AccessKeyId,
          s3SecretAccessKey: settings.s3SecretAccessKey,
          s3Endpoint: settings.s3Endpoint ?? undefined,
          s3ForcePathStyle: settings.s3ForcePathStyle,
          s3PublicBaseUrl: settings.s3PublicBaseUrl ?? undefined,
          s3BasePath: settings.s3BasePath ?? undefined,
        }
      )
    }

    return UploadServiceFacade.instance
  }
}
