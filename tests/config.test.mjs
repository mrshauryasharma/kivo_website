import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PLATFORM_RULES, INSTALLER_RETENTION_POLICY } from '../server/config.js';

describe('Configuration & Platform Rules Tests', () => {
  it('should define all 4 supported platforms', () => {
    const platforms = Object.keys(PLATFORM_RULES);
    assert.deepEqual(platforms.sort(), ['android', 'mac-arm64', 'mac-intel', 'windows']);
  });

  it('should have .apk extension allowed for Android', () => {
    assert.ok(PLATFORM_RULES.android.allowedExtensions.includes('.apk'));
    assert.equal(PLATFORM_RULES.android.defaultFileName, 'KivoBrowser.apk');
  });

  it('should have .exe extension allowed for Windows', () => {
    assert.ok(PLATFORM_RULES.windows.allowedExtensions.includes('.exe'));
    assert.equal(PLATFORM_RULES.windows.defaultFileName, 'KivoSetup-x64.exe');
  });

  it('should have .dmg extension allowed for macOS platforms', () => {
    assert.ok(PLATFORM_RULES['mac-arm64'].allowedExtensions.includes('.dmg'));
    assert.ok(PLATFORM_RULES['mac-intel'].allowedExtensions.includes('.dmg'));
    assert.equal(PLATFORM_RULES['mac-arm64'].defaultFileName, 'Kivo-arm64.dmg');
    assert.equal(PLATFORM_RULES['mac-intel'].defaultFileName, 'Kivo-intel.dmg');
  });

  it('should have strict retention policy enabled', () => {
    assert.equal(INSTALLER_RETENTION_POLICY.autoDelete, false);
    assert.equal(INSTALLER_RETENTION_POLICY.retention, 'permanent');
    assert.equal(INSTALLER_RETENTION_POLICY.policy, 'indefinite_until_manual_removal');
    assert.equal(INSTALLER_RETENTION_POLICY.ttlHours, null);
  });
});
