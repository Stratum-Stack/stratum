import { S3UploadAdapter, type S3UploadAdapterConfig } from '@infrastructure/adapters/s3-upload.adapter'

export class S3AdapterFactory {
  static create(config: S3UploadAdapterConfig): S3UploadAdapter {
    return new S3UploadAdapter(config)
  }
}
