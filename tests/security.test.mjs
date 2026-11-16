import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateUploadId,
  validateUploadInitBody,
} from '../server/security.js';
import { PLATFORM_RULES } from '../server/config.js';

describe('Security Input Validation Tests', () => {
  it('should accept valid UUID uploadId', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    assert.equal(validateUploadId(validUuid), validUuid);
  });

  it('should reject invalid UUID uploadId', () => {
    assert.throws(() => validateUploadId('invalid-uuid'), /Invalid uploadId/);
    assert.throws(() => validateUploadId('../etc/passwd'), /Invalid uploadId/);
    assert.throws(() => validateUploadId(''), /Invalid uploadId/);
    assert.throws(() => validateUploadId(null), /Invalid uploadId/);
  });

  it('should validate valid installer upload body', () => {
    const body = {
      platform: 'windows',
      filename: 'KivoSetup.exe',
      version: '1.0.0',
      totalSize: 85000000,
      totalChunks: 9,
    };
    const validated = validateUploadInitBody(body, PLATFORM_RULES);
    assert.equal(validated.platform, 'windows');
    assert.equal(validated.filename, 'KivoSetup.exe');
    assert.equal(validated.version, '1.0.0');
    assert.equal(validated.totalSize, 85000000);
    assert.equal(validated.totalChunks, 9);
  });

  it('should reject directory traversal in filename', () => {
    const body = {
      platform: 'windows',
      filename: '../../malicious.exe',
      version: '1.0.0',
      totalSize: 1000,
      totalChunks: 1,
    };
    assert.throws(() => validateUploadInitBody(body, PLATFORM_RULES), /Path separators are not allowed/);
  });

  it('should reject invalid file extensions for platform', () => {
    const body = {
      platform: 'windows',
      filename: 'KivoSetup.dmg',
      version: '1.0.0',
      totalSize: 1000,
      totalChunks: 1,
    };
    assert.throws(() => validateUploadInitBody(body, PLATFORM_RULES), /Invalid file extension/);
  });

  it('should reject unknown platform', () => {
    const body = {
      platform: 'linux-unknown',
      filename: 'kivo.deb',
      version: '1.0.0',
      totalSize: 1000,
      totalChunks: 1,
    };
    assert.throws(() => validateUploadInitBody(body, PLATFORM_RULES), /Invalid platform/);
  });
});
