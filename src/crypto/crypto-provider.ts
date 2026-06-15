export interface AESConfig {
	mode: string;
	key: string;
	keyFormat: string;
	iv?: string;
	ivFormat?: string;
	nonce?: string;
	nonceFormat?: string;
	inputFormat?: string;
	outputFormat?: string;
}

export interface CryptoProvider {
	encryptAES(data: string, config: AESConfig): Promise<Uint8Array>;
	decryptAES(data: Uint8Array, config: AESConfig): Promise<string>;
}

export class WebCryptoProvider implements CryptoProvider {
	async encryptAES(data: string, config: AESConfig): Promise<Uint8Array> {
		if (config.mode !== 'GCM') {
			throw new Error('WebCryptoProvider only supports GCM mode');
		}
		// Web Crypto API实现将在WebCryptoAdapter中提供
		throw new Error('WebCryptoProvider should use WebCryptoAdapter directly');
	}

	async decryptAES(data: Uint8Array, config: AESConfig): Promise<string> {
		if (config.mode !== 'GCM') {
			throw new Error('WebCryptoProvider only supports GCM mode');
		}
		// Web Crypto API实现将在WebCryptoAdapter中提供
		throw new Error('WebCryptoProvider should use WebCryptoAdapter directly');
	}
}