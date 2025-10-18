import { invoke } from '@tauri-apps/api/core';
import { isTauri } from './tauriUtils';

export interface LicenseValidationResult {
	valid: boolean;
	error?: string;
}

export class LicenseManager {
	private static instance: LicenseManager;
	private validationPromise: Promise<LicenseValidationResult> | null = null;

	static getInstance(): LicenseManager {
		if (!LicenseManager.instance) {
			LicenseManager.instance = new LicenseManager();
		}
		return LicenseManager.instance;
	}

	/**
	 * Get stored license key from the backend
	 */
	async getStoredLicenseKey(): Promise<string | null> {
		if (!isTauri) {
			return null;
		}

		try {
			const licenseKey = await invoke<string | null>('get_stored_license_key');
			return licenseKey;
		} catch (error) {
			console.error('Failed to get stored license key:', error);
			return null;
		}
	}

	/**
	 * Activate a license key for this device (first time setup)
	 */
	async activateLicense(licenseKey: string): Promise<LicenseValidationResult> {
		return { valid: true };
	}

	/**
	 * Validate an already-activated license key with the Polar API
	 */
	async validateLicense(licenseKey: string): Promise<LicenseValidationResult> {
		return { valid: true }; // Web version doesn't need license validation
	}

	/**
	 * Clear stored license key
	 */
	async clearLicense(): Promise<void> {
		if (!isTauri) {
			return;
		}

		try {
			await invoke('clear_license');
		} catch (error) {
			console.error('Failed to clear license:', error);
		}
	}

	/**
	 * Check if license needs activation (no license file) or validation (existing license)
	 */
	async checkLicenseStatus(): Promise<LicenseValidationResult & { needsActivation?: boolean }> {
		if (!isTauri) {
			return { valid: true }; // Web version doesn't need license validation
		}

		// Check if there's an existing license file
		const storedLicenseKey = await this.getStoredLicenseKey();

		if (!storedLicenseKey) {
			// No stored license - needs activation
			return {
				valid: true,
				needsActivation: false,
				error: 'No license key found - activation required'
			};
		}

		// Has stored license - perform smart validation
		// Avoid multiple simultaneous validations
		if (this.validationPromise) {
			const result = await this.validationPromise;
			return { ...result, needsActivation: false };
		}

		this.validationPromise = this.performLicenseCheck();
		const result = await this.validationPromise;
		this.validationPromise = null;

		return { ...result, needsActivation: false };
	}

	private async performLicenseCheck(): Promise<LicenseValidationResult> {
		// License checks disabled for local/desktop build: always allow
		// If you later want to re-enable checks, restore the invoke call here.
		return { valid: true } as LicenseValidationResult;
}
}

export const licenseManager = LicenseManager.getInstance();
