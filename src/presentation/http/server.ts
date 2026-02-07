import Table from 'cli-table3'
import { createApp } from './app'
import { settings } from '@config/settings'

function formatServerBanner(host: string, port: number): string {
  const table = new Table({
    colWidths: [12, 40],
    wordWrap: true,
    style: {
      head: [],
      border: [],
      compact: false,
    },
  })

  table.push([{ colSpan: 2, content: 'Soundr API Server', hAlign: 'center' }])
  table.push(
    ['Status', '✓ Running'],
    ['Port', port.toString()],
    ['Host', host],
    ['API', `http://${host}:${port}/api`],
    ['Docs', `http://${host}:${port}/docs`],
    ['Health', `http://${host}:${port}/health`],
  )

  return `\n${table.toString()}`
}

/**
 * Start HTTP server
 * Main entry point for the API server
 */
async function startServer() {
  try {
    const app = await createApp()

    await app.listen({
      port: settings.port,
      host: settings.host,
    })

    console.log(formatServerBanner(settings.host, settings.port))

    // Graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'] as const
    let isShuttingDown = false

    signals.forEach((signal) => {
      process.on(signal, async () => {
        if (isShuttingDown) {
          console.log('Force shutdown...')
          process.exit(1)
        }

        isShuttingDown = true
        console.log(`\n${signal} received, shutting down gracefully...`)

        try {
          // Stop accepting new connections
          await app.close()
          console.log('Server closed successfully')
          process.exit(0)
        } catch (error) {
          console.error('Error during shutdown:', error)
          process.exit(1)
        }
      })
    })

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error)
      if (!isShuttingDown) {
        isShuttingDown = true
        app.close().finally(() => process.exit(1))
      }
    })

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason)
    })

  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Start server if this file is run directly
if (import.meta.main) {
  startServer()
}

export { startServer }
