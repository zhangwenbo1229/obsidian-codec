import { InputFormat, parseInputByKeyFormatForWebCrypto } from '../operations/implementations/encryption/format-utils';

export class WebCryptoAdapter {
	static async importKey(format: InputFormat, keyData: string): Promise<CryptoKey> {
		const keyDataBytes = parseInputByKeyFormatForWebCrypto(keyData, format);
		return await crypto.subtle.importKey(
			'raw',
			keyDataBytes,
			{ name: 'AES-GCM', length: 256 },
			false,
			['encrypt', 'decrypt']
		);
	}

	static async encryptGCM(
		plaintext: string,
		key: CryptoKey,
		iv: Uint8Array
	): Promise<Uint8Array> {
		const encoder = new TextEncoder();
		const data = encoder.encode(plaintext);

		const encrypted = await crypto.subtle.encrypt(
			{ name: 'AES-GCM', iv: iv },
			key,
			data
		);

		return new Uint8Array(encrypted);
	}

	static async decryptGCM(
		ciphertext: Uint8Array,
		key: CryptoKey,
		iv: Uint8Array
	): Promise<string> {
		const decrypted = await crypto.subtle.decrypt(
			{ name: 'AES-GCM', iv: iv },
			key,
			ciphertext
		);

		const decoder = new TextDecoder();
		return decoder.decode(decrypted);
	}
}
