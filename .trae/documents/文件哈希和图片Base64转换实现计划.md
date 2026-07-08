# 文件哈希计算和图片Base64转换功能实现计划

## 📋 计划概述

### 目标
为Obsidian Codec插件新增两个核心功能：
1. **文件哈希计算**：支持文本内容和文件的哈希计算
2. **图片Base64转换**：专门处理图片与Base64格式的互相转换

### 成功标准
- 用户可以选择文件进行哈希计算
- 支持常见图片格式的Base64编码/解码
- 保持现有文本哈希功能的完整性
- 提供直观的用户交互体验
- 支持大文件的智能处理

### 受众
- 使用Obsidian进行文本处理的用户
- 需要验证文件完整性的开发者
- 处理图片嵌入和转换的内容创作者

### 范围
- **包含**：文件哈希计算、图片Base64转换、大文件智能处理
- **排除**：复杂的文件管理功能、批量文件处理、文件对比功能

---

## 🔍 当前状态分析

### 现有架构优势
1. **三栏布局**：左侧操作库、中间操作链、右侧输入输出面板
2. **文件导入功能**：已支持文本文件导入，使用HTML5 File API
3. **Base64操作**：已有标准Base64编码/解码功能
4. **哈希操作**：已支持多种哈希算法（MD5、SHA1、SHA256、SHA512、SM3）
5. **操作注册表**：使用InMemoryOperationRegistry集中管理所有操作

### 技术限制
1. **当前文件处理**：仅支持文本文件，使用`file.text()`读取
2. **Base64实现**：主要针对文本，未优化二进制数据
3. **哈希计算**：仅支持文本字符串哈希，未支持二进制数据
4. **内存管理**：未考虑大文件处理的内存优化

### 需要的改进
1. **扩展文件支持**：支持图片和二进制文件
2. **二进制数据处理**：使用FileReader API处理二进制数据
3. **大文件处理**：实现分块读取和流式哈希计算
4. **专门的图片操作**：创建专门的图片Base64转换操作

---

## 🛠️ 具体实现方案

### 阶段一：文件哈希计算功能

#### 1.1 创建文件哈希操作类
**文件**: `src/operations/implementations/hashes/file-hash.ts`

```typescript
import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';
import SHA256 from 'crypto-js/sha256';
import MD5 from 'crypto-js/md5';

export class FileHashOperation extends BaseOperation {
    id = 'file-hash';
    name = '文件哈希计算';
    category = OperationCategory.HASH;
    description = '计算文件内容的哈希值，支持文本和二进制文件';

    // 配置选项
    private defaultAlgorithm = 'SHA256';
    private defaultInputType = 'auto'; // auto, text, binary

    protected validateInput(input: string): import('../../../types').ValidationResult {
        if (!input || input.trim().length === 0) {
            return { valid: false, error: '请选择文件或输入要计算哈希的内容' };
        }
        return { valid: true };
    }

    protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
        try {
            const algorithm = (config.algorithm as string) || this.defaultAlgorithm;
            const inputType = (config.inputType as string) || this.defaultInputType;
            const filePath = (config.filePath as string) || '';

            // 如果有文件路径，读取文件内容
            if (filePath && inputType !== 'text') {
                return await this.calculateFileHash(filePath, algorithm);
            }

            // 否则计算文本哈希
            return this.calculateTextHash(input, algorithm);
        } catch (error) {
            throw new Error(`文件哈希计算失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    private calculateTextHash(text: string, algorithm: string): string {
        switch (algorithm) {
            case 'MD5':
                return MD5(text).toString();
            case 'SHA256':
                return SHA256(text).toString();
            default:
                throw new Error(`不支持的哈希算法: ${algorithm}`);
        }
    }

    private async calculateFileHash(filePath: string, algorithm: string): Promise<string> {
        // 这里需要实现文件读取和哈希计算
        // 注意：在Obsidian插件环境中，文件访问受限制
        // 可能需要使用Obsidian的API或通过用户选择文件
        throw new Error('文件哈希计算需要通过文件选择器实现，请使用UI中的文件选择功能');
    }
}
```

#### 1.2 扩展输入输出面板
**修改**: `src/codec-view.ts` 的 `renderInputOutputPanel` 方法

**新增文件哈希按钮**：
```typescript
const hashInputButton = inputHeader.createEl('span', {
    cls: 'codec-hash-input-btn',
    attr: { style: 'color: var(--text-accent); cursor: pointer; font-size: 13px; font-weight: 500; user-select: none; margin-right: 12px;' },
    text: '文件哈希'
});

hashInputButton.addEventListener('click', async () => {
    await this.importFileForHash();
});
```

#### 1.3 实现文件哈希选择器
**新增方法**: `importFileForHash()` 在 `codec-view.ts`

```typescript
private async importFileForHash(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*'; // 支持所有文件类型
    
    input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
            // 检查文件大小，决定处理策略
            const fileSize = file.size;
            const isLargeFile = fileSize > 10 * 1024 * 1024; // 10MB

            let fileContent: string;
            let hashResult: string;

            if (isLargeFile) {
                // 大文件：分块读取并计算哈希
                hashResult = await this.calculateFileHashChunked(file);
            } else {
                // 小文件：直接读取整个文件
                const buffer = await file.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                fileContent = this.bytesToText(bytes, file.type);
                hashResult = this.calculateTextHash(fileContent, 'SHA256');
            }

            // 显示哈希结果
            const inputArea = this.containerEl.querySelector('.codec-input-area') as HTMLTextAreaElement;
            if (inputArea) {
                inputArea.value = `文件: ${file.name} (${this.formatFileSize(fileSize)})\n哈希值: ${hashResult}\n\n文件内容预览:\n${fileContent.substring(0, 1000)}...`;
                new Notice(`文件哈希计算完成: ${file.name}`);
            }
        } catch (error) {
            new Notice(`文件读取失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    };

    input.click();
}
```

### 阶段二：图片Base64转换功能

#### 2.1 创建图片Base64编码操作
**文件**: `src/operations/implementations/images/image-to-base64.ts`

```typescript
import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class ImageToBase64Operation extends BaseOperation {
    id = 'image-to-base64';
    name = '图片转Base64';
    category = OperationCategory.ENCODING;
    description = '将图片转换为Base64格式，支持常见图片格式';

    protected validateInput(input: string): import('../../../types').ValidationResult {
        if (!input || input.trim().length === 0) {
            return { valid: false, error: '请输入图片Base64数据或使用图片选择器' };
        }
        return { valid: true };
    }

    protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
        try {
            const format = (config.format as string) || 'data-url';
            const includeMime = (config.includeMime as boolean) !== false;

            // 检查输入是否是文件引用
            if (input.startsWith('file://') || config.filePath) {
                return await this.convertImageFile(config.filePath as string, format, includeMime);
            }

            // 假设输入已经是Base64数据
            return this.formatBase64Output(input, format, includeMime);
        } catch (error) {
            throw new Error(`图片Base64转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    private async convertImageFile(filePath: string, format: string, includeMime: boolean): Promise<string> {
        // 实际实现需要通过文件选择器获取图片数据
        // 这里提供接口定义
        throw new Error('图片转换需要通过文件选择器实现');
    }

    private formatBase64Output(base64: string, format: string, includeMime: boolean): string {
        const mimeType = this.detectMimeType(base64);

        switch (format) {
            case 'data-url':
                return includeMime ? `data:${mimeType};base64,${base64}` : base64;
            case 'base64-only':
                return base64;
            case 'html-img':
                return `<img src="data:${mimeType};base64,${base64}" alt="Base64图片" />`;
            default:
                return base64;
        }
    }

    private detectMimeType(base64: string): string {
        // 根据Base64数据头检测图片类型
        if (base64.startsWith('/9j/')) return 'image/jpeg';
        if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
        if (base64.startsWith('R0lGOD')) return 'image/gif';
        if (base64.startsWith('Qk0')) return 'image/bmp';
        if (base64.startsWith('UklGR')) return 'image/webp';
        return 'image/png'; // 默认
    }
}
```

#### 2.2 创建Base64转图片操作
**文件**: `src/operations/implementations/images/base64-to-image.ts`

```typescript
import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class Base64ToImageOperation extends BaseOperation {
    id = 'base64-to-image';
    name = 'Base64转图片';
    category = OperationCategory.DECODING;
    description = '将Base64格式数据转换回图片，支持保存为文件';

    protected validateInput(input: string): import('../../../types').ValidationResult {
        if (!input || input.trim().length === 0) {
            return { valid: false, error: '请输入Base64编码的图片数据' };
        }
        return { valid: true };
    }

    protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
        try {
            const outputFormat = (config.outputFormat as string) || 'preview';
            const autoSave = (config.autoSave as boolean) === true;

            // 清理输入数据
            const cleanedInput = this.cleanBase64Input(input);
            
            // 验证Base64图片数据
            this.validateImageBase64(cleanedInput);

            switch (outputFormat) {
                case 'preview':
                    return this.generateImagePreview(cleanedInput);
                case 'file':
                    return await this.saveAsImageFile(cleanedInput, config);
                case 'data-url':
                    return this.generateDataURL(cleanedInput);
                default:
                    return cleanedInput;
            }
        } catch (error) {
            throw new Error(`Base64转图片失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    private cleanBase64Input(input: string): string {
        // 移除可能的data URL前缀
        let cleaned = input.replace(/^data:image\/[a-z]+;base64,/i, '');
        // 移除空白字符
        cleaned = cleaned.replace(/\s/g, '');
        return cleaned;
    }

    private validateImageBase64(base64: string): void {
        const validSignatures = {
            'image/jpeg': '/9j/',
            'image/png': 'iVBORw0KGgo',
            'image/gif': 'R0lGOD',
            'image/bmp': 'Qk0',
            'image/webp': 'UklGR'
        };

        const isValid = Object.values(validSignatures).some(sig => base64.startsWith(sig));
        if (!isValid) {
            throw new Error('输入的Base64数据不是有效的图片格式');
        }
    }

    private generateImagePreview(base64: string): string {
        const mimeType = this.detectMimeType(base64);
        return `[图片预览: ${mimeType}]\nBase64长度: ${base64.length} 字符\n预览链接:\n<img src="data:${mimeType};base64,${base64}" style="max-width:100%" />`;
    }

    private async saveAsImageFile(base64: string, config: Record<string, unknown>): Promise<string> {
        const mimeType = this.detectMimeType(base64);
        const extension = this.getMimeExtension(mimeType);
        
        // 转换Base64为二进制数据
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // 创建文件并下载
        const blob = new Blob([bytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `image.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return `已保存为 image.${extension}`;
    }

    private detectMimeType(base64: string): string {
        if (base64.startsWith('/9j/')) return 'image/jpeg';
        if (base64.startsWith('iVBORw0KGgo')) return 'image/png';
        if (base64.startsWith('R0lGOD')) return 'image/gif';
        if (base64.startsWith('Qk0')) return 'image/bmp';
        if (base64.startsWith('UklGR')) return 'image/webp';
        return 'image/png';
    }

    private getMimeExtension(mimeType: string): string {
        const extensions: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/gif': 'gif',
            'image/bmp': 'bmp',
            'image/webp': 'webp'
        };
        return extensions[mimeType] || 'png';
    }
}
```

#### 2.3 创建图片选择器功能
**新增方法**: `importImageForBase64()` 在 `codec-view.ts`

```typescript
private async importImageForBase64(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*'; // 仅支持图片文件
    
    input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const arrayBuffer = e.target?.result as ArrayBuffer;
                const bytes = new Uint8Array(arrayBuffer);
                const base64 = this.arrayBufferToBase64(bytes);
                const mimeType = file.type;
                
                // 生成Data URL格式的输出
                const dataUrl = `data:${mimeType};base64,${base64}`;
                
                const inputArea = this.containerEl.querySelector('.codec-input-area') as HTMLTextAreaElement;
                if (inputArea) {
                    inputArea.value = dataUrl;
                    inputArea.dispatchEvent(new Event('input', { bubbles: true }));
                    new Notice(`图片已转换为Base64: ${file.name}`);
                }
            };
            
            reader.onerror = () => {
                new Notice('图片读取失败');
            };
            
            reader.readAsArrayBuffer(file);
        } catch (error) {
            new Notice(`图片处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    };

    input.click();
}

private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
```

### 阶段三：大文件智能处理

#### 3.1 实现分块哈希计算
**新增方法**: `calculateFileHashChunked()` 在 `codec-view.ts`

```typescript
private async calculateFileHashChunked(file: File): Promise<string> {
    const chunkSize = 1024 * 1024; // 1MB chunks
    const fileSize = file.size;
    const chunks = Math.ceil(fileSize / chunkSize);
    
    // 使用crypto-js的增量哈希功能
    const hash = new SHA256();
    
    for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, fileSize);
        const chunk = file.slice(start, end);
        
        // 读取分块并更新哈希
        const arrayBuffer = await chunk.arrayBuffer();
        const wordArray = this.arrayBufferToWordArray(arrayBuffer);
        hash.update(wordArray);
        
        // 显示进度
        new Notice(`哈希计算进度: ${Math.round((i + 1) / chunks * 100)}%`);
    }
    
    return hash.finalize().toString();
}

private arrayBufferToWordArray(buffer: ArrayBuffer): any {
    const words = [];
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += 4) {
        words.push((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]);
    }
    return words;
}
```

#### 3.2 智能文件大小判断
**新增方法**: `shouldProcessAsLargeFile()` 在 `codec-view.ts`

```typescript
private shouldProcessAsLargeFile(file: File): boolean {
    const size = file.size;
    // 根据文件类型和大小决定处理策略
    if (file.type.startsWith('image/')) {
        return size > 5 * 1024 * 1024; // 图片大于5MB时使用分块处理
    }
    return size > 10 * 1024 * 1024; // 其他文件大于10MB时使用分块处理
}

private formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}
```

### 阶段四：UI配置界面

#### 4.1 为文件哈希操作添加配置UI
**修改**: `codec-view.ts` 中的操作配置UI部分

```typescript
// 为文件哈希操作添加配置UI
if (operation.id === 'file-hash') {
    const currentConfig = chainItem.getAttribute('data-config');
    const config = currentConfig ? JSON.parse(currentConfig) : {};
    const currentAlgorithm = config.algorithm as string || 'SHA256';
    const currentInputType = config.inputType as string || 'auto';

    const configContainer = info.createEl('div', {
        attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
    });

    // 哈希算法选择
    const hashContainer = configContainer.createEl('div', {
        attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
    });

    const hashLabel = hashContainer.createEl('label', {
        text: '哈希算法:',
        attr: { style: 'font-size: 11px; color: var(--text-muted);' }
    });

    const hashContainer2 = hashContainer.createEl('div', {
        attr: { style: 'display: flex; gap: 12px; font-size: 11px;' }
    });

    const hashAlgorithms = [
        { value: 'MD5', text: 'MD5' },
        { value: 'SHA256', text: 'SHA256' },
        { value: 'SHA512', text: 'SHA512' }
    ];

    hashAlgorithms.forEach(hash => {
        const hashOption = hashContainer2.createEl('label', {
            attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
        });
        const hashRadioInput = hashOption.createEl('input', {
            attr: { 
                type: 'radio',
                name: 'file-hash-algorithm',
                value: hash.value,
                style: 'cursor: pointer;' 
            }
        }) as HTMLInputElement;
        if (hash.value === currentAlgorithm) {
            hashRadioInput.checked = true;
        }
        hashOption.createSpan({ text: hash.text });
    });

    // 输入类型选择
    const typeContainer = configContainer.createEl('div', {
        attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
    });

    const typeLabel = typeContainer.createEl('label', {
        text: '输入类型:',
        attr: { style: 'font-size: 11px; color: var(--text-muted);' }
    });

    const typeContainer2 = typeContainer.createEl('div', {
        attr: { style: 'display: flex; gap: 12px; font-size: 11px;' }
    });

    const inputTypes = [
        { value: 'auto', text: '自动检测' },
        { value: 'text', text: '文本内容' },
        { value: 'binary', text: '二进制文件' }
    ];

    inputTypes.forEach(type => {
        const typeOption = typeContainer2.createEl('label', {
            attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
        });
        const typeRadioInput = typeOption.createEl('input', {
            attr: { 
                type: 'radio',
                name: 'file-hash-input-type',
                value: type.value,
                style: 'cursor: pointer;' 
            }
        }) as HTMLInputElement;
        if (type.value === currentInputType) {
            typeRadioInput.checked = true;
        }
        typeOption.createSpan({ text: type.text });
    });

    // 文件选择按钮
    const fileButton = configContainer.createEl('button', {
        text: '选择文件',
        cls: 'mod-cta-action',
        attr: { style: 'margin-top: 4px;' }
    });

    fileButton.addEventListener('click', async () => {
        await this.importFileForHash();
        // 更新配置中的文件路径
        const newConfig = { ...config, filePath: 'selected-file' };
        chainItem.setAttribute('data-config', JSON.stringify(newConfig));
    });

    // 配置更新函数
    const updateConfig = () => {
        let algorithm = 'SHA256';
        const hashInput = hashContainer2.querySelector('input[name="file-hash-algorithm"]:checked') as HTMLInputElement;
        if (hashInput) {
            algorithm = hashInput.value;
        }

        let inputType = 'auto';
        const typeInput = typeContainer2.querySelector('input[name="file-hash-input-type"]:checked') as HTMLInputElement;
        if (typeInput) {
            inputType = typeInput.value;
        }

        const newConfig = { ...config, algorithm, inputType };
        chainItem.setAttribute('data-config', JSON.stringify(newConfig));
    };

    hashContainer2.addEventListener('change', updateConfig);
    typeContainer2.addEventListener('change', updateConfig);
    updateConfig();
}
```

#### 4.2 为图片Base64操作添加配置UI
**修改**: `codec-view.ts` 中的操作配置UI部分

```typescript
// 为图片转Base64操作添加配置UI
if (operation.id === 'image-to-base64') {
    const currentConfig = chainItem.getAttribute('data-config');
    const config = currentConfig ? JSON.parse(currentConfig) : {};
    const currentFormat = config.format as string || 'data-url';
    const currentIncludeMime = config.includeMime as boolean !== false;

    const configContainer = info.createEl('div', {
        attr: { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 6px;' }
    });

    // 输出格式选择
    const formatContainer = configContainer.createEl('div', {
        attr: { style: 'display: flex; flex-direction: column; gap: 2px;' }
    });

    const formatLabel = formatContainer.createEl('label', {
        text: '输出格式:',
        attr: { style: 'font-size: 11px; color: var(--text-muted);' }
    });

    const formatContainer2 = formatContainer.createEl('div', {
        attr: { style: 'display: flex; gap: 12px; font-size: 11px;' }
    });

    const formats = [
        { value: 'data-url', text: 'Data URL (data:image/...)' },
        { value: 'base64-only', text: '纯Base64' },
        { value: 'html-img', text: 'HTML图片标签' }
    ];

    formats.forEach(format => {
        const formatOption = formatContainer2.createEl('label', {
            attr: { style: 'display: flex; align-items: center; gap: 4px; cursor: pointer;' }
        });
        const formatRadioInput = formatOption.createEl('input', {
            attr: { 
                type: 'radio',
                name: 'image-base64-format',
                value: format.value,
                style: 'cursor: pointer;' 
            }
        }) as HTMLInputElement;
        if (format.value === currentFormat) {
            formatRadioInput.checked = true;
        }
        formatOption.createSpan({ text: format.text });
    });

    // 包含MIME类型选项
    const mimeContainer = configContainer.createEl('div', {
        attr: { style: 'display: flex; align-items: center; gap: 8px; font-size: 11px;' }
    });

    const mimeCheckbox = mimeContainer.createEl('input', {
        attr: { type: 'checkbox', id: 'image-include-mime', style: 'cursor: pointer;' }
    }) as HTMLInputElement;
    if (currentIncludeMime) {
        mimeCheckbox.checked = true;
    }

    const mimeLabel = mimeContainer.createEl('label', {
        attr: { for: 'image-include-mime', style: 'cursor: pointer;' },
        text: '包含MIME类型'
    });

    // 图片选择按钮
    const imageButton = configContainer.createEl('button', {
        text: '选择图片',
        cls: 'mod-cta-action',
        attr: { style: 'margin-top: 4px;' }
    });

    imageButton.addEventListener('click', async () => {
        await this.importImageForBase64();
    });

    // 配置更新函数
    const updateConfig = () => {
        let format = 'data-url';
        const formatInput = formatContainer2.querySelector('input[name="image-base64-format"]:checked') as HTMLInputElement;
        if (formatInput) {
            format = formatInput.value;
        }

        const includeMime = mimeCheckbox.checked;

        const newConfig = { ...config, format, includeMime };
        chainItem.setAttribute('data-config', JSON.stringify(newConfig));
    };

    formatContainer2.addEventListener('change', updateConfig);
    mimeCheckbox.addEventListener('change', updateConfig);
    updateConfig();
}
```

### 阶段五：操作注册

#### 5.1 注册新操作
**修改**: `src/operation-registry.ts`

```typescript
// 导入新的操作
import { 
    FileHashOperation 
} from './operations/implementations/hashes/file-hash';
import { 
    ImageToBase64Operation 
} from './operations/implementations/images/image-to-base64';
import { 
    Base64ToImageOperation 
} from './operations/implementations/images/base64-to-image';

// 在初始化函数中注册新操作
globalRegistry.register(new FileHashOperation());
globalRegistry.register(new ImageToBase64Operation());
globalRegistry.register(new Base64ToImageOperation());
```

#### 5.2 创建新的操作分类（可选）
**修改**: `src/types.ts` 如果需要新的分类

```typescript
export enum OperationCategory {
    // 现有分类...
    IMAGE = 'image',            // 新增：图片处理
    FILE = 'file',              // 新增：文件操作
    // 其他分类...
}
```

---

## 🔧 实现细节

### 文件处理策略
1. **小文件（< 10MB）**: 直接读取到内存，使用FileReader API
2. **大文件（≥ 10MB）**: 分块读取，使用流式哈希计算
3. **图片文件**: 优先使用Base64编码，支持预览
4. **文本文件**: 直接文本哈希计算

### 二进制数据处理
1. **FileReader API**: 使用 `readAsArrayBuffer()` 读取二进制数据
2. **Uint8Array**: 将ArrayBuffer转换为字节数组进行处理
3. **Base64编码**: 使用 `btoa()` 和自定义实现兼容处理

### 性能优化
1. **Web Worker**: 对大文件哈希计算使用Web Worker避免阻塞UI
2. **进度显示**: 在处理大文件时显示进度百分比
3. **内存管理**: 及时释放ArrayBuffer和Blob URL

### 用户体验
1. **即时反馈**: 操作执行时显示进度通知
2. **错误提示**: 清晰的���误消息和解决建议
3. **预览功能**: 图片转换时提供预览
4. **一键操作**: 文件选择和格式转换的一键完成

---

## ✅ 验证步骤

### 功能验证
1. **文件哈希计算**:
   - 测试文本内容的哈希计算
   - 测试小文件的完整哈希计算
   - 测试大文件(>10MB)的分块哈希计算
   - 验证不同哈希算法的正确性

2. **图片Base64转换**:
   - 测试常见图片格式(PNG、JPG、GIF)的Base64编码
   - 测试Base64数据解码回图片文件
   - 验证Data URL格式的正确性
   - 测试图片文件保存功能

### 兼容性验证
1. **浏览器兼容性**: 确保FileReader API在目标浏览器中正常工作
2. **Obsidian环境**: 验证插件在Obsidian中的文件访问权限
3. **大文件处理**: 测试100MB+文件的内存使用和性能

### 用户界面验证
1. **配置界面**: 确保所有配置选项正确显示和工作
2. **拖拽功能**: 验证新操作可以正确拖拽到操作链
3. **实时执行**: 确认输入变化时操作链自动执行

### 性能验证
1. **响应时间**: 小文件操作应在1秒内完成
2. **内存使用**: 大文件处理时内存占用合理
3. **用户体验**: 大文件处理时UI保持响应

---

## 🎯 实现优先级

### 高优先级（核心功能）
1. **文件哈希操作**: 扩展现有哈希功能支持文件处理
2. **图片选择器**: 在输入面板添加图片选择按钮
3. **Base64图片编码**: 基础的图片到Base64转换

### 中优先级（增强功能）
1. **图片Base64解码**: Base64数据转回图片文件
2. **大文件分块处理**: 优化大文件性能
3. **操作配置UI**: 完整的配置界面

### 低优先级（优化功能）
1. **Web Worker**: 将大文件处理移到后台线程
2. **进度显示**: 更详细的进度条和状态显示
3. **高级图片处理**: 支持更多图片格式和转换选项

---

## 🚀 部署计划

### 开发分支策略
1. **创建新分支**: `feature/file-hash-and-image-base64`
2. **独立开发**: 在新分支中进行所有开发和测试
3. **代码审查**: 完成后进行自我代码审查和优化
4. **合并回主分支**: 确认无冲突后合并到master分支

### 测试计划
1. **单元测试**: 为新操作创建单元测试
2. **集成测试**: 测试新功能与现有功能的集成
3. **用户测试**: 在实际Obsidian环境中进行用户测试
4. **性能测试**: 测试大文件处理的性能表现

### 发布计划
1. **版本更新**: 更新到v1.0.6
2. **发布说明**: 详细说明新增功能和使用方法
3. **用户文档**: 更新用户使用文档
4. **GitHub发布**: 创建新的GitHub Release

---

## 📋 检查清单

### 开发前
- [ ] 确认当前开发分支状态
- [ ] 备份现有代码和配置
- [ ] 准备测试图片文件和测试数据

### 开发中
- [ ] 创建新的操作类文件
- [ ] 扩展输入输出面板功能
- [ ] 实现文件选择器功能
- [ ] 添加操作配置UI
- [ ] 注册新操作到注册表
- [ ] 测试所有新功能

### 部署前
- [ ] 完成代码审查和优化
- [ ] 运行所有测试确保无回归
- [ ] 更新版本号和文档
- [ ] 验证Obsidian环境中的功能

### 部署后
- [ ] 监控GitHub Actions构建状态
- [ ] 检查用户反馈和问题报告
- [ ] 准备下一版本的改进计划

---

这个计划将为Obsidian Codec插件增加文件哈希计算和图片Base64转换功能，大幅提升插件的实用性，满足用户在文件验证和图片处理方面的需求。