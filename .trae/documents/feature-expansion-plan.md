# 功能扩展实施计划

## 摘要
为 Obsidian Codec 插件添加三个新功能：1. SM3 哈希操作，2. 字体配置功能，3. 文件导入按钮。

## 当前状态分析

### 现有哈希操作
- 位于 `src/operations/implementations/hashes/` 目录
- 已实现 MD5、SHA1、SHA256、SHA512
- 统一使用 crypto-js 库实现
- 都继承自 BaseOperation 基类

### UI 结构
- 右侧面板包含输入框和输出框
- 输入框有清空按钮
- 使用 Obsidian 的原生组件和样式
- 设置界面简单，只显示"无需额外设置"

### 技术限制
- 需要处理 SM3 哈希算法（crypto-js 不直接支持）
- 需要实现字体配置的持久化存储
- 需要实现文件选择和读取功能

## 实施方案

### 1. 添加 SM3 哈希操作

#### 文件创建
- **文件**：`src/operations/implementations/hashes/sm3.ts`
- **实现方式**：自定义 SM3 哈希算法（因为 crypto-js 不直接支持）

#### 操作注册
- **文件**：`src/operations/registry.ts`
- **操作**：导入并注册 SM3Operation

#### UI 显示
- **文件**：`src/codec-view.ts`
- **操作**：SM3 会自动显示在哈希分组中（通过 category 过滤）

### 2. 添加字体配置功能

#### 数据结构扩展
- **文件**：`src/types.ts`
- **操作**：扩展 PluginState 接口，添加字体配置字段

#### 设置界面实现
- **文件**：`src/settings.ts`
- **操作**：添加字体配置选项（字体家族、字体大小）

#### 样式应用
- **文件**：`src/codec-view.ts` 和 `styles.css`
- **操作**：应用用户配置的字体到输入框和输出框

### 3. 添加文件导入按钮

#### UI 按钮添加
- **文件**：`src/codec-view.ts`
- **位置**：输入框头部，清空按钮左侧
- **样式**：与清空按钮保持一致的设计风格

#### 文件选择实现
- **技术**：使用 Obsidian 的文件系统 API
- **功能**：允许用户选择文本文件并读取内容到输入框

## 技术实现细节

### SM3 哈希算法实现
```typescript
export class SM3Operation extends BaseOperation {
    id = 'sm3';
    name = 'SM3';
    category = OperationCategory.HASH;
    
    protected async executeLogic(input: string): Promise<string> {
        // 自定义 SM3 哈希实现
        const sm3Hash = this.sm3Hash(input);
        return sm3Hash;
    }
    
    private sm3Hash(message: string): string {
        // SM3 算法实现
    }
}
```

### 字体配置存储
```typescript
// PluginState 接口扩展
interface PluginState {
    existingFields...;
    fontConfig?: {
        inputFontFamily?: string;
        inputFontSize?: string;
        outputFontFamily?: string;
        outputFontSize?: string;
    };
}
```

### 文件导入实现
```typescript
private addImportButton(): void {
    const importButton = this.inputHeader.createEl('button', {
        text: '导入',
        cls: 'codec-import-button'
    });
    
    importButton.addEventListener('click', async () => {
        // 文件选择和读取逻辑
    });
}
```

## 验证步骤

### 功能验证
1. SM3 哈希：
   - 验证哈希算法正确性
   - 测试不同输入的输出
   - 确认在哈希分组中正确显示

2. 字体配置：
   - 测试配置持久化
   - 验证字体只应用于输入框和输出框
   - 确认其他区域不受影响

3. 文件导入：
   - 测试文件选择功能
   - 验证大文件处理
   - 确认编码正确处理

### 兼容性验证
1. 检查现有功能不受影响
2. 验证 Obsidian 环境兼容性
3. 确认样式正确应用

## 实施顺序

1. **SM3 哈希操作**：创建算法实现并注册
2. **字体配置**：扩展数据结构和设置界面
3. **文件导入按钮**：添加 UI 和文件处理逻辑
4. **样式应用**：应用字体配置到特定区域
5. **测试验证**：全面测试所有功能

## 风险评估

### 技术风险
- SM3 算法实现的正确性需要验证
- 字体配置可能影响布局
- 文件读取在不同操作系统可能有差异

### 缓解措施
- 使用已验证的 SM3 算法实现
- 提供默认字体配置确保兼容性
- 使用 Obsidian 原生 API 处理文件操作

## 成功标准

1. ✅ SM3 哈希操作正确显示在哈希分组中
2. ✅ SM3 哈希算法输出正确
3. ✅ 字体配置正确应用于输入框和输出框
4. ✅ 其他区域字体不受配置影响
5. ✅ 文件导入按钮功能正常
6. ✅ 所有现有功能保持兼容