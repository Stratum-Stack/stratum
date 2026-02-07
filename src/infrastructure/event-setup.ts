import { type EventBusPort } from '@/users/application/ports/event-bus.port'
import { UserDeletedIntegrationEvent } from '@/users/application/integration-events/user-deleted.integration-event'
import { UserLicenseChangedIntegrationEvent } from '@/users/application/integration-events/user-license-changed.integration-event'
import { UserAllowancesChangedIntegrationEvent } from '@/users/application/integration-events/user-allowances-changed.integration-event'
import { FileUploadedIntegrationEvent } from '@/upload/application/integration-events/file-uploaded.integration-event'
import { FileMetadataUpdatedIntegrationEvent } from '@/upload/application/integration-events/file-metadata-updated.integration-event'
import { FileDeletedIntegrationEvent } from '@/upload/application/integration-events/file-deleted.integration-event'
import { UploadIntentConfirmedIntegrationEvent } from '@/upload/application/integration-events/upload-intent-confirmed.integration-event'

/**
 * Setup all Integration Event handlers at app root level
 * Handlers listen to Integration Events published by domain services
 * Use this for cross-cutting concerns like logging, notifications, analytics, etc.
 */
export function setupEventHandlers(eventBus: EventBusPort): void {
  // ============================================
  // USER INTEGRATION EVENTS
  // ============================================

  eventBus.subscribe('user:deleted', async (event: UserDeletedIntegrationEvent) => {
    console.log('[EVENT] User deleted:', {
      id: event.payload.id,
      email: event.payload.email,
      deletedAt: event.payload.deletedAt ? new Date(event.payload.deletedAt).toISOString() : null,
    })
  })

  eventBus.subscribe('user:license-changed', async (event: UserLicenseChangedIntegrationEvent) => {
    console.log('[EVENT] User license changed:', {
      id: event.payload.id,
      email: event.payload.email,
      licenseAcceptedAt: event.payload.licenseAcceptedAt ? new Date(event.payload.licenseAcceptedAt).toISOString() : null,
    })
  })

  eventBus.subscribe('user:allowances-changed', async (event: UserAllowancesChangedIntegrationEvent) => {
    console.log('[EVENT] User allowances changed:', {
      id: event.payload.id,
      email: event.payload.email,
      allowancesCount: event.payload.allowances.length,
    })
  })

  // ============================================
  // UPLOAD INTEGRATION EVENTS
  // ============================================

  eventBus.subscribe('file:uploaded', async (event: FileUploadedIntegrationEvent) => {
    console.log('[EVENT] File uploaded:', {
      id: event.payload.id,
      filename: event.payload.storageKey,
      size: event.payload.size,
    })
  })

  eventBus.subscribe('file:metadata-updated', async (event: FileMetadataUpdatedIntegrationEvent) => {
    console.log('[EVENT] File metadata updated:', {
      id: event.payload.id,
      filename: event.payload.storageKey,
    })
  })

  eventBus.subscribe('file:deleted', async (event: FileDeletedIntegrationEvent) => {
    console.log('[EVENT] File deleted:', {
      id: event.payload.id,
      filename: event.payload.storageKey,
    })
  })

  eventBus.subscribe('upload:intent-confirmed', async (event: UploadIntentConfirmedIntegrationEvent) => {
    console.log('[EVENT] Upload intent confirmed:', {
      id: event.payload.id,
    })
  })

  // ============================================
  // SETTINGS INTEGRATION EVENTS
  // ============================================

  eventBus.subscribe('settings:updated', async (event: any) => {
    console.log('[EVENT] Settings updated:', {
      count: event.payload.settings.length,
      updatedBy: event.payload.updatedBy,
      keys: event.payload.settings.map((s: any) => s.key),
    })
    // TODO: Clear settings cache
    // Example: await cache.del('settings:*')
  })
}
