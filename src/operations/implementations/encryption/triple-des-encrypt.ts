import { BaseOperation } from '../../base-operation';
import { OperationCategory, ValidationResult } from '../../../types';
import * as CryptoJS from 'crypto-js';
import {
    parseInputByKeyFormat,
    parseInputByIVFormat,
    formatOutput,
    InputFormat,
    OutputFormat
} from './format-utils';

export interface TripleDESEncryptConfig {
    key: string;
    keyFormat: InputFormat;
    iv: string;
    ivFormat: InputFormat;
    mode: 'CBC' | 'ECB';
    outputFormat: OutputFormat;
    padding: 'PKCS7' | 'ZeroPadding';
}

export class TripleDESEncryptOperation extends BaseOperation {
    id = 'triple-des-encrypt';
    name = '3DES加密';
    category = OperationCategory.ENCRYPTION;
    description = '使用3DES(Triple DES)算法对数据进行加密';

    protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
        const desConfig = config as unknown as TripleDESEncryptConfig;

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

        const options: Parameters<typeof CryptoJS.TripleDES.encrypt>[2] = {
            mode: desConfig.mode === 'CBC' ? CryptoJS.mode.CBC : CryptoJS.mode.ECB,
            padding: desConfig.padding === 'PKCS7' ? CryptoJS.pad.Pkcs7 : CryptoJS.pad.ZeroPadding
        };

        if (parsedIV !== undefined) {
            options.iv = parsedIV;
        }

        const encrypted = CryptoJS.TripleDES.encrypt(input, parsedKey, options);
        return formatOutput(encrypted, desConfig.outputFormat || 'hex');
    }

    protected validateInput(input: string): ValidationResult {
        if (!input || input.length === 0) {
            return {
                valid: false,
                error: '请输入需要加密的内容'
            };
        }
        return { valid: true };
    }
}
