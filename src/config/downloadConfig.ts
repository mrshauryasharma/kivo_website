/**
 * Centralized Configuration for KIVO Browser Downloads
 * 
 * IMPORTANT:
 * - If `downloadUrl` is null or empty, the download button is cleanly disabled with a "Coming Soon" badge.
 * - When genuine build binaries are ready, simply set the URLs below.
 * - Never provide fake placeholder or dummy download links.
 */

export interface PlatformDownloadConfig {
  name: string;
  platform: 'windows' | 'macos';
  osTarget: string;
  architecture: string;
  installerFormat: string;
  version: string;
  releaseDate: string;
  downloadUrl: string | null; // e.g. "https://github.com/kivobrowser/releases/download/v1.0.0/KivoSetup-x64.exe" or null
  fileSize?: string;
  minRequirements: string;
}

export interface KivoReleaseConfig {
  latestVersion: string;
  releaseDate: string;
  channel: 'Stable' | 'Beta' | 'Preview';
  windows: PlatformDownloadConfig;
  macos: PlatformDownloadConfig;
}

export const DOWNLOAD_CONFIG: KivoReleaseConfig = {
  latestVersion: '1.0.0-preview',
  releaseDate: 'November 2026',
  channel: 'Preview',
  windows: {
    name: 'KIVO for Windows',
    platform: 'windows',
    osTarget: 'Windows 10 / 11',
    architecture: '64-bit (x64)',
    installerFormat: '.exe installer',
    version: '1.0.0-preview',
    releaseDate: 'Q4 2026',
    // Set to null or a valid direct URL once production installers are published
    downloadUrl: null,
    fileSize: '~84 MB',
    minRequirements: 'Windows 10 build 19041+ or Windows 11, 4 GB RAM, 500 MB disk space',
  },
  macos: {
    name: 'KIVO for macOS',
    platform: 'macos',
    osTarget: 'macOS 12 (Monterey) or later',
    architecture: 'Universal (Apple Silicon & Intel 64-bit)',
    installerFormat: '.dmg disk image',
    version: '1.0.0-preview',
    releaseDate: 'Q4 2026',
    // Set to null or a valid direct URL once production installers are published
    downloadUrl: null,
    fileSize: '~92 MB',
    minRequirements: 'macOS 12+, Apple M-series or Intel Core i5/i7+, 4 GB RAM',
  },
};
