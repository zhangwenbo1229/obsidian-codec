import * as CryptoJS from 'crypto-js';

export type InputFormat = 'hex' | 'raw' | 'base64';
export type OutputFormat = 'hex' | 'raw' | 'base64';

export function hexToRaw(hex: string): CryptoJS.lib.WordArray {
    try {
        return CryptoJS.enc.Hex.parse(hex);
    } catch (error) {
        throw new Error(`Invalid hex format: ${error}`);
    }
}

// 新增：Web Crypto API 专用的 Uint8Array 格式转换函数

export function hexToUint8Array(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
        throw new Error('Invalid hex string length');
    }
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

export function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export function rawStringToUint8Array(raw: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(raw);
}

// 新增：Web Crypto API 专用的密钥格式解析
export function parseInputByKeyFormatForWebCrypto(input: string, format: InputFormat): Uint8Array {
    switch (format) {
        case 'hex':
            return hexToUint8Array(input);
        case 'base64':
            return base64ToUint8Array(input);
        case 'raw':
        default:
            return rawStringToUint8Array(input);
    }
}

// 新增：Web Crypto API 专用的IV/Nonce格式解析
export function parseInputByIVFormatForWebCrypto(input: string, format: InputFormat): Uint8Array {
    return parseInputByKeyFormatForWebCrypto(input, format);
}

export function rawToHex(raw: CryptoJS.lib.WordArray): string {
    return raw.toString(CryptoJS.enc.Hex);
}

export function base64ToRaw(base64: string): CryptoJS.lib.WordArray {
    try {
        return CryptoJS.enc.Base64.parse(base64);
    } catch (error) {
        throw new Error(`Invalid base64 format: ${error}`);
    }
}

export function rawToBase64(raw: CryptoJS.lib.WordArray): string {
    return raw.toString(CryptoJS.enc.Base64);
}

export function rawStringToRaw(raw: string): CryptoJS.lib.WordArray {
    return CryptoJS.enc.Utf8.parse(raw);
}

export function rawToRawString(raw: CryptoJS.lib.WordArray): string {
    return raw.toString(CryptoJS.enc.Utf8);
}

export function parseInputByKeyFormat(input: string, format: InputFormat): CryptoJS.lib.WordArray {
    switch (format) {
        case 'hex':
            return hexToRaw(input);
        case 'base64':
            return base64ToRaw(input);
        case 'raw':
        default:
            return rawStringToRaw(input);
    }
}

export function parseInputByIVFormat(input: string, format: InputFormat): CryptoJS.lib.WordArray {
    return parseInputByKeyFormat(input, format);
}

export function formatOutput(encrypted: CryptoJS.lib.CipherParams, outputFormat: OutputFormat): string {
    const ciphertext = encrypted.ciphertext;
    
    switch (outputFormat) {
        case 'hex':
            return rawToHex(ciphertext);
        case 'base64':
            return rawToBase64(ciphertext);
        case 'raw':
        default:
            return rawToRawString(ciphertext);
    }
}