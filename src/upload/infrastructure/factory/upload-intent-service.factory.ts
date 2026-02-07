import { UploadIntentService } from '@application/services/upload-intent.service'
import { type EventBusPort } from '@application/ports/event-bus.port'
import { type UploadAdapterPort } from '@application/ports/upload-adapter.port'
import { type UploadServicePort } from '@application/ports/upload-service.port'

export class UploadIntentServiceFactory {
  static create(
    eventBus: EventBusPort,
    uploadAdapter: UploadAdapterPort,
    uploadService: UploadServicePort
  ) {
    return new UploadIntentService(eventBus, uploadAdapter, uploadService)
  }
}
