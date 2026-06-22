import { BaseOperation } from '../../base-operation';
import { OperationCategory, ValidationResult } from '../../../types';
import * as CryptoJS from 'crypto-js';
import {
    parseInputByKeyFormat,
    parseInputByIVFormat,
    InputFormat,
    OutputFormat
} from './format-utils';

export interface DESDecryptConfig {
    key: string;
    keyFormat: InputFormat;
    iv: string;
    ivFormat: InputFormat;
    mode: 'CBC' | 'ECB';
    inputFormat: OutputFormat;
    padding: 'PKCS7' | 'ZeroPadding';
}

export class DESDecryptOperation extends BaseOperation {
    id = 'des-decrypt';
    name = 'DES解密';
    category = OperationCategory.DECRYPTION;
    description = '使用DES算法对数据进行解密';

    protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
        const desConfig = config as unknown as DESDecryptConfig;

        if (!desConfig.key || desConfig.key.trim() === '') {
            throw new Error('请输入密钥(Key)');
        }

        const parsedKey = parseInputByKeyFormat(desConfig.key, desConfig.keyFormat || 'raw');

        let parsedIV: CryptoJS.lib.WordArray | undefined;
        if (desConfig.mode !== 'ECB') {
            if (!desConfig.iv || desConfig.iv.trim() === '') {
                throw new Error('请输入初始化向量(IV)');
            }
            parsedIV = parseInputByIVFormat(desConfig.iv, desConfig.ivFormat || 'raw');
        }

        const ciphertext = parseInputByKeyFormat(input, desConfig.inputFormat || 'hex');

        const options: Parameters<typeof CryptoJS.DES.decrypt>[2] = {
            mode: desConfig.mode === 'CBC' ? CryptoJS.mode.CBC : CryptoJS.mode.ECB,
            padding: desConfig.padding === 'PKCS7' ? CryptoJS.pad.Pkcs7 : CryptoJS.pad.ZeroPadding
        };

        if (parsedIV !== undefined) {
            options.iv = parsedIV;
        }

        const decrypted = CryptoJS.DES.decrypt(
            CryptoJS.lib.CipherParams.create({ ciphertext }),
            parsedKey,
            options
        );

        const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

        if (!decryptedText) {
            throw new Error('解密失败，请检查密钥和IV是否正确');
        }

        return decryptedText;
    }

    protected validateInput(input: string): ValidationResult {
        if (!input || input.length === 0) {
            return {
                valid: false,
                error: '请输入需要解密的内容'
            };
        }
        return { valid: true };
    }
}
