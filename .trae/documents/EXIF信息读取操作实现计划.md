# EXIF信息读取操作实现计划

## 📋 计划概述

### 目标
在"其他分组"中新增一个"读取EXIF"操作，实现对用户选中图片的EXIF信息的全面读取和格式化输出。

### 成功标准
- 用户可以通过"选中"按钮选择图片文件
- EXIF读取操作能够提取所有要求的EXIF信息（基础拍摄信息、GPS位置信息、设备信息、技术规格）
- 以格式化的Markdown形式输出EXIF数据
- 操作集成到现有的操作链系统中
- 提供友好的错误处理和用户指导

### 受众
- 需要查看图片元数据的摄影师和内容创作者
- 进行图片管理和分析的数字资产管理人员
- 需要验证图片技术规格的开发者和测试人员

### 范围
- **包含**：EXIF数据提取、Markdown格式化输出、错误处理、用户指导
- **排除**：EXIF数据编辑、批量处理、云存储集成

---

## 🔍 当前状态分析

### 现有架构优势
1. **图片处理基础**：已有完整的图片文件读取和Base64转换功能
2. **操作扩展机制**：成熟的操作注册和UI配置系统
3. **错误处理模式**：完善的错误提示和用户反馈机制
4. **分类组织方式**：清晰的分组架构，支持新操作集成

### 技术限制
1. **EXIF库依赖**：当前项目没有EXIF读取库，需要添加`exif-js`库
2. **二进制处理**：需要处理图片的二进制数据以提取EXIF信息
3. **数据格式化**：需要将提取的EXIF数据格式化为Markdown
4. **缺失分类名称**：`constants.ts`中缺少OTHER分类的中文显示名称

### 需要的改进
1. **添加EXIF库**：安装`exif-js`库用于EXIF数据提取
2. **创建EXIF操作**：实现专门的EXIF读取操作类
3. **格式化输出**：将EXIF数据转换为格式化的Markdown
4. **补充分类名称**：在constants.ts中添加OTHER分类的显示名称

---

## 🛠️ 具体实现方案

### 阶段一：环境准备

#### 1.1 添加EXIF处理库
**修改文件**: `package.json`

```json
"dependencies": {
    "@types/crypto-js": "^4.2.2",
    "crypto-js": "^4.2.0",
    "js-beautify": "^1.15.4",
    "exif-js": "^2.3.0"
}
```

**安装命令**:
```bash
npm install exif-js
npm install @types/exif-js --save-dev
```

#### 1.2 补充分类名称
**修改文件**: `src/constants.ts`

```typescript
export const OPERATION_CATEGORIES: Record<OperationCategory, string> = {
    encoding: '编码',
    decoding: '解码',
    hash: '哈希',
    encryption: '加密',
    decryption: '解密',
    beautify: '数据美化',
    'data-format': '数据格式',
    'extract-analysis': '提取分析',
    'url-ip': 'URL/IP',
    datetime: '时间日期',
    mac: 'MAC认证',
    other: '其他'
};
```

### 阶段二：创建EXIF读取操作

#### 2.1 创建操作类文件
**新建文件**: `src/operations/implementations/other/read-exif.ts`

```typescript
import { BaseOperation } from '../../base-operation';
import { OperationCategory } from '../../../types';

export class ReadExifOperation extends BaseOperation {
    id = 'read-exif';
    name = '读取EXIF';
    category = OperationCategory.OTHER;
    description = '读取图片的EXIF信息，包括拍摄参数、GPS位置、设备信息等';

    protected validateInput(input: string): import('../../../types').ValidationResult {
        if (!input || input.trim().length === 0) {
            return { valid: false, error: '请选择图片文件或输入图片的Base64数据' };
        }
        
        // 验证是否是图片数据
        if (!input.startsWith('data:image/') && !this.isBase64Image(input)) {
            return { valid: false, error: '输入必须是图片数据（Data URL或Base64格式）' };
        }
        
        return { valid: true };
    }

    protected async executeLogic(input: string, config: Record<string, unknown>): Promise<string> {
        try {
            // 动态导入exif-js库
            const EXIF = await import('exif-js');
            
            // 清理输入数据
            const imageData = this.cleanInputData(input);
            
            // 从Base64数据创建Image对象
            const image = await this.loadImage(imageData);
            
            // 提取EXIF数据
            const exifData = await this.extractExifData(image, EXIF);
            
            // 格式化为Markdown输出
            return this.formatExifAsMarkdown(exifData);
            
        } catch (error) {
            throw new Error(`EXIF读取失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    private cleanInputData(input: string): string {
        // 移除Data URL前缀，获得纯Base64数据
        if (input.startsWith('data:image/')) {
            const parts = input.split(',');
            return parts[1];
        }
        return input;
    }

    private isBase64Image(data: string): boolean {
        // 检查是否是有效的图片Base64数据
        const imageSignatures = [
            'iVBORw0KGgo', // PNG
            '/9j/',         // JPEG
            'R0lGOD',      // GIF
            'Qk0',         // BMP
            'UklGR'        // WebP
        ];
        return imageSignatures.some(sig => data.startsWith(sig));
    }

    private async loadImage(base64Data: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('图片加载失败'));
            image.src = `data:image/jpeg;base64,${base64Data}`;
        });
    }

    private async extractExifData(image: HTMLImageElement, EXIF: any): Promise<any> {
        return new Promise((resolve, reject) => {
            EXIF.getData(image, function() {
                const allTags = EXIF.getAllTags(image);
                if (!allTags || Object.keys(allTags).length === 0) {
                    reject(new Error('该图片不包含EXIF信息'));
                } else {
                    resolve(allTags);
                }
            });
        });
    }

    private formatExifAsMarkdown(exifData: any): string {
        let markdown = '# 📷 图片EXIF信息\n\n';
        
        // 基础拍摄信息
        const shootingInfo = this.extractShootingInfo(exifData);
        if (Object.keys(shootingInfo).length > 0) {
            markdown += '## 🎯 基础拍摄信息\n\n';
            markdown += '| 参数 | 值 |\n';
            markdown += '|------|-----|\n';
            for (const [key, value] of Object.entries(shootingInfo)) {
                markdown += `| ${key} | ${value} |\n`;
            }
            markdown += '\n';
        }
        
        // GPS位置信息
        const gpsInfo = this.extractGpsInfo(exifData);
        if (Object.keys(gpsInfo).length > 0) {
            markdown += '## 📍 GPS位置信息\n\n';
            markdown += '| 参数 | 值 |\n';
            markdown += '|------|-----|\n';
            for (const [key, value] of Object.entries(gpsInfo)) {
                markdown += `| ${key} | ${value} |\n';
            }
            markdown += '\n';
        }
        
        // 设备和制造商信息
        const deviceInfo = this.extractDeviceInfo(exifData);
        if (Object.keys(deviceInfo).length > 0) {
            markdown += '## 📱 设备和制造商信息\n\n';
            markdown += '| 参数 | 值 |\n';
            markdown += '|------|-----|\n';
            for (const [key, value] of Object.entries(deviceInfo)) {
                markdown += `| ${key} | ${value} |\n`;
            }
            markdown += '\n';
        }
        
        // 图片技术规格
        const techSpecs = this.extractTechSpecs(exifData);
        if (Object.keys(techSpecs).length > 0) {
            markdown += '## 🔧 图片技术规格\n\n';
            markdown += '| 参数 | 值 |\n';
            markdown += '|------|-----|\n';
            for (const [key, value] of Object.entries(techSpecs)) {
                markdown += `| ${key} | ${value} |\n`;
            }
        }
        
        return markdown;
    }

    private extractShootingInfo(exifData: any): Record<string, string> {
        const info: Record<string, string> = {};
        
        if (exifData.DateTime) info['拍摄时间'] = exifData.DateTime;
        if (exifData.ExposureTime) info['快门速度'] = this.formatFraction(exifData.ExposureTime);
        if (exifData.FNumber) info['光圈'] = `f/${exifData.FNumber}`;
        if (exifData.ISO) info['ISO'] = exifData.ISO;
        if (exifData.FocalLength) info['焦距'] = `${exifData.FocalLength}mm`;
        if (exifData.Flash) info['闪光灯'] = exifData.Flash;
        if (exifData.WhiteBalance) info['白平衡'] = exifData.WhiteBalance;
        if (exifData.ExposureProgram) info['曝光程序'] = exifData.ExposureProgram;
        if (exifData.MeteringMode) info['测光模式'] = exifData.MeteringMode;
        
        return info;
    }

    private extractGpsInfo(exifData: any): Record<string, string> {
        const info: Record<string, string> = {};
        
        if (exifData.GPSLatitude && exifData.GPSLongitude) {
            info['纬度'] = this.formatDMS(exifData.GPSLatitude, exifData.GPSLatitudeRef);
            info['经度'] = this.formatDMS(exifData.GPSLongitude, exifData.GPSLongitudeRef);
            if (exifData.GPSAltitude) {
                info['海拔'] = `${exifData.GPSAltitude}米`;
            }
        }
        
        if (exifData.GPSDateStamp) {
            info['GPS日期'] = exifData.GPSDateStamp;
        }
        
        if (exifData.GPSTimeStamp) {
            info['GPS时间'] = exifData.GPSTimeStamp;
        }
        
        return info;
    }

    private extractDeviceInfo(exifData: any): Record<string, string> {
        const info: Record<string, string> = {};
        
        if (exifData.Make) info['制造商'] = exifData.Make;
        if (exifData.Model) info['相机型号'] = exifData.Model;
        if (exifData.LensModel) info['镜头型号'] = exifData.LensModel;
        if (exifData.Software) info['软件'] = exifData.Software;
        if (exifData.Orientation) info['方向'] = exifData.Orientation;
        
        return info;
    }

    private extractTechSpecs(exifData: any): Record<string, string> {
        const info: Record<string, string> = {};
        
        if (exifData.PixelXDimension && exifData.PixelYDimension) {
            info['图片尺寸'] = `${exifData.PixelXDimension} × ${exifData.PixelYDimension}`;
        }
        if (exifData.XResolution && exifData.YResolution) {
            info['分辨率'] = `${exifData.XResolution} × ${exifData.YResolution} DPI`;
        }
        if (exifData.ColorSpace) info['色彩空间'] = exifData.ColorSpace;
        if (exifData.Compression) info['压缩算法'] = exifData.Compression;
        if (exifData.Orientation) info['旋转方向'] = exifData.Orientation;
        
        return info;
    }

    private formatFraction(value: any): string {
        if (typeof value === 'number') {
            // 快于1/500秒格式
            if (value < 1) {
                const denominator = Math.round(1 / value);
                return `1/${denominator}秒`;
            }
            return `${value}秒`;
        }
        return value.toString();
    }

    private formatDMS(coordinates: number[], ref: string): string {
        if (!coordinates || coordinates.length < 3) return '未知';
        
        const degrees = coordinates[0];
        const minutes = coordinates[1];
        const seconds = coordinates[2];
        
        return `${degrees}°${minutes}'${seconds}" ${ref}`;
    }
}
```

### 阶段三：注册操作

#### 3.1 注册EXIF读取操作
**修改文件**: `src/operations/registry.ts`

```typescript
// 导入EXIF操作
import { 
    ReadExifOperation 
} from './implementations/other/read-exif';

// 在初始化函数中注册
globalRegistry.register(new ReadExifOperation());
```

### 阶段四：UI集成

#### 4.1 确保UI显示分类名称
**检查文件**: `src/codec-view.ts`

确认现有的分组渲染逻辑能正确显示"其他"分类：
```typescript
// 在renderOperationsList方法中
const other = operations.filter(op => op.category === OperationCategory.OTHER);
if (other.length > 0) {
    this.renderOperationGroup(container, other, '其他');
}
```

### 阶段五：测试和优化

#### 5.1 功能测试
- [ ] 选择没有EXIF的图片，验证错误处理
- [ ] 选择有完整EXIF的图片，验证所有信息提取
- [ ] 测试不同图片格式（JPEG、PNG、TIFF）
- [ ] 验证Markdown输出格式

#### 5.2 性能优化
- [ ] 大图片文件的处理速度
- [ ] 内存使用情况
- [ ] 错误恢复机制

---

## 🔧 实现细节

### EXIF数据提取策略

#### 图片加载机制
```typescript
private async loadImage(base64Data: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('图片加载失败'));
        image.src = `data:image/jpeg;base64,${base64Data}`;
    });
}
```

**注意事项**：
- 使用JPEG格式作为默认格式，因为EXIF主要存储在JPEG中
- 设置适当的超时处理
- 提供清晰的错误消息

#### EXIF数据提取
```typescript
private async extractExifData(image: HTMLImageElement, EXIF: any): Promise<any> {
    return new Promise((resolve, reject) => {
        EXIF.getData(image, function() {
            const allTags = EXIF.getAllTags(image);
            if (!allTags || Object.keys(allTags).length === 0) {
                reject(new Error('该图片不包含EXIF信息'));
            } else {
                resolve(allTags);
            }
        });
    });
}
```

### Markdown格式化策略

#### 分组格式化
```typescript
private formatExifAsMarkdown(exifData: any): string {
    let markdown = '# 📷 图片EXIF信息\n\n';
    
    // 基础拍摄信息表格
    markdown += '## 🎯 基础拍摄信息\n\n';
    markdown += '| 参数 | 值 |\n';
    markdown += '|------|-----|\n';
    // ... 添加数据
    
    // GPS位置信息表格
    // 设备信息表格
    // 技术规格表格
    
    return markdown;
}
```

#### 数据格式化规则
- **快门速度**：自动转换为"1/500秒"格式
- **GPS坐标**：转换为度分秒(DMS)格式
- **光圈值**：转换为"f/2.8"格式
- **空值处理**：不显示空字段

---

## ✅ 验证步骤

### 功能验证

#### EXIF提取功能
- [ ] 选择包含完整EXIF的JPEG图片
- [ ] 验证基础拍摄信息提取（快门、光圈、ISO等）
- [ ] 验证GPS位置信息提取（经纬度、海拔）
- [ ] 验证设备信息提取（制造商、型号、镜头）
- [ ] 验证技术规格提取（尺寸、分辨率、色彩空间）

#### 输出格式验证
- [ ] Markdown标题正确显示
- [ ] 表格格式完整
- [ ] 特殊字符正确转义
- [ ] 中文显示正常

#### 错误处理验证
- [ ] 没有EXIF的图片显示友好错误
- [ ] 损坏的图片数据不崩溃
- [ ] 网络加载失败有提示
- [ ] 非图片文件被拒绝

### 兼容性验证

#### 图片格式支持
- [ ] JPEG格式（主要EXIF载体）
- [ ] TIFF格式（也支持EXIF）
- [ ] PNG格式（可能包含EXIF）
- [ ] HEIC格式（现代iPhone格式）

#### 浏览器兼容性
- [ ] Chrome/Edge中的FileReader API
- [ ] Electron环境中的Image对象
- [ ] ES6模块导入兼容性

### 性能验证

#### 处理速度
- [ ] 小图片(<1MB)处理时间<2秒
- [ ] 大图片(>10MB)处理时间<10秒
- [ ] 内存使用合理（<100MB增量）

#### 用户体验
- [ ] 错误提示清晰易懂
- [ ] 操作反馈及时
- [ ] 结果格式易读

---

## 🎯 实现优先级

### 高优先级（核心功能）
1. **环境准备**：安装exif-js库和类型定义
2. **创建EXIF操作**：实现核心的EXIF提取功能
3. **Markdown格式化**：实现要求的四个信息分组输出
4. **操作注册**：将操作注册到系统中

### 中优先级（增强功能）
1. **补充分类名称**：完善constants.ts中的分类显示
2. **错误处理**：完善各种异常情况的处理
3. **数据格式化**：优化数值显示格式

### 低优先级（优化功能）
1. **性能优化**：大图片处理优化
2. **UI增强**：添加配置选项（如果需要）
3. **高级EXIF**：支持更多EXIF标签

---

## 🚀 部署计划

### 开发分支策略
1. **继续在当前分支**：`feature/file-hash-and-image-base64`
2. **增量开发**：逐步实现EXIF功能
3. **频繁测试**：每个功能实现后立即测试
4. **依赖管理**：确保exif-js库正确集成

### 测试计划
1. **单元测试**：测试EXIF数据提取和格式化逻辑
2. **集成测试**：测试完整的操作链流程
3. **图片测试**：使用各种包含EXIF的测试图片
4. **用户测试**：在Obsidian环境中进行实际使用测试

### 发布计划
1. **版本更新**：更新到v1.0.6
2. **依赖安装**：确保所有依赖正确安装
3. **功能说明**：详细说明EXIF读取功能
4. **示例文档**：提供使用示例和测试图片说明

---

## 📋 检查清单

### 开发前
- [x] 确认当前开发分支状态
- [x] 分析现有架构和图片处理机制
- [x] 确定技术方案（exif-js库）
- [ ] 准备测试图片文件
- [ ] 安装exif-js依赖库

### 开发中
- [ ] 补充constants.ts中的分类名称
- [ ] 创建ReadExifOperation类
- [ ] 实现EXIF数据提取逻辑
- [ ] 实现Markdown格式化输出
- [ ] 注册EXIF操作到系统
- [ ] 添加错误处理和用户指导

### 部署前
- [ ] 完成代码审查和优化
- [ ] 测试各种图片格式
- [ ] 验证EXIF数据完整性
- [ ] 检查Markdown输出格式
- [ ] 更新版本号和文档

### 部署后
- [ ] 监控依赖库的兼容性
- [ ] 收集用户反馈和测试结果
- [ ] 准备后续版本改进计划
- [ ] 更新使用文档和示例

---

## 📝 关键技术决策

### 1. EXIF库选择
**决策**：使用exif-js库
**理由**：
- 纯JavaScript实现，无需额外依赖
- 支持浏览器和Electron环境
- 社区活跃，文档完善
- 与现有架构兼容

### 2. 输出格式选择
**决策**：使用Markdown格式
**理由**：
- 在Obsidian中显示效果最佳
- 支持表格和标题格式
- 易于后续编辑和分享
- 符合Obsidian用户的习惯

### 3. 分组归属选择
**决策**：放在"其他"分组
**理由**：
- EXIF读取不是编解码操作
- 与现有图片处理操作性质不同
- "其他"分组为多功能操作提供空间
- 符合用户预期

### 4. 错误处理策略
**决策**：提供详细的错误信息和解决建议
**理由**：
- 用户可能对EXIF不熟悉
- 图片格式多样，需要明确指导
- 帮助用户理解失败原因
- 提供操作建议

---

## 💡 实现亮点

### 功能完整性
- ✅ 支持所有要求的EXIF信息类型
- ✅ 智能数据格式化和显示
- ✅ 完整的错误处理机制
- ✅ 用户友好的操作体验

### 技术创新
- ✅ 动态模块导入（exif-js）
- ✅ Promise化的异步处理
- ✅ 表格化的Markdown输出
- ✅ 智能数值格式化

### 用户体验
- ✅ 一键操作选择图片
- ✅ 清晰的分组信息显示
- ✅ 详细的EXIF数据分析
- ✅ 易读的Markdown格式

---

这个计划将为Obsidian Codec插件添加强大的EXIF信息读取功能，满足用户对图片元数据分析的需求，并提供专业的格式化输出。