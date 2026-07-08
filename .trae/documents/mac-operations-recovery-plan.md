# MAC 操作加密算法恢复计划

## 摘要
恢复 CMAC 和 CBC-MAC 操作中被删除的 DES、3DES、SM4 加密算法支持，使用 crypto-js 库替代之前的 AES 模拟实现，提供真正的算法支持同时保持良好的用户体验。

## 当前状态分析

### 已删除的算法支持
- **CMAC 操作**：DES、3DES、SM4 已被禁用，直接抛出错误
- **CBC-MAC 操作**：DES、SM4 已被禁用，直接抛出错误
- **UI 层面**：相关算法选项已被移除，只保留 AES 选项

### 现有架构
- MAC 操作位于 `src/operations/implementations/mac/` 目录
- 每个操作都继承 `BaseOperation` 基类
- 使用 Web Crypto API 作为主要的加密提供者
- UI 配置在 `codec-view.ts` 中通过配置对象管理

### 技术限制
- Web Crypto API 不支持 DES、3DES、SM4 算法
- 之前的实现使用 AES 模拟，导致用户输入与实际处理不符
- 密钥验证要求精确匹配，不允许自动填充

## 实施方案

### 核心决策
1. **加密库选择**：使用 crypto-js 库提供真正的 DES/3DES/SM4 算法支持
2. **用户体验**：采用"警告但允许执行"策略，提供清晰的使用说明
3. **实现方式**：集成 crypto-js，重写相关算法实现

### 具体变更

#### 1. 依赖管理
- **文件**：`package.json`
- **操作**：添加 crypto-js 依赖
- **原因**：提供真正的 DES/3DES/SM4 算法实现

```json
{
  "dependencies": {
    "crypto-js": "^4.2.0"
  }
}
```

#### 2. CMAC 操作恢复
- **文件**：`src/operations/implementations/mac/cmac.ts`
- **操作**：
  - 恢复 DES-CMAC、3DES-CMAC、SM4-CMAC 实现
  - 使用 crypto-js 的 DES、TripleDES、SM4 API
  - 添加警告机制，提示用户这些算法的使用注意事项
  - 保持现有的密钥验证逻辑

#### 3. CBC-MAC 操作恢复
- **文件**：`src/operations/implementations/mac/cbc-mac.ts`
- **操作**：
  - 恢复 DES-CBC-MAC、SM4-CBC-MAC 实现
  - 使用 crypto-js 的 CBC 模式 API
  - 添加相同的警告机制
  - 更新密钥验证逻辑以支持不同算法

#### 4. UI 恢复
- **文件**：`src/codec-view.ts`
- **操作**：
  - CMAC 操作：恢复 `['AES', 'DES', '3DES', 'SM4']` 选项
  - CBC-MAC 操作：恢复 `['AES', 'DES', 'SM4']` 选项
  - 添加算法选择说明文字

#### 5. 构建配置更新
- **文件**：如需要更新构建配置以包含 crypto-js
- **操作**：确保 crypto-js 被正确打包到最终的 main.js 中

### 技术实现细节

#### CMAC 实现架构
```typescript
// 使用 crypto-js 实现 DES-CMAC
private async desCMAC(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    // 1. 数据预处理
    // 2. 使用 crypto-js.DES 进行加密
    // 3. CMAC 子密钥生成
    // 4. CBC 模式处理
    // 5. 返回 MAC 值
}
```

#### CBC-MAC 实现架构
```typescript
// 使用 crypto-js 实现 DES-CBC-MAC
private async desCBCMAC(data: Uint8Array, key: Uint8Array, padding: string): Promise<Uint8Array> {
    // 1. 使用 crypto-js.DES 创建 cipher
    // 2. 应用 CBC 模式
    // 3. 处理填充方式
    // 4. 返回最后一个密文块
}
```

#### 用户体验改进
- 添加算法信息提示：显示算法强度、用途、注意事项
- 密钥验证：保持精确匹配但在错误信息中提供指导
- 性能提示：说明这些算法可能比 AES 慢

## 假设和决策

### 技术假设
1. crypto-js 库能够在浏览器环境中正常工作
2. crypto-js 支持 DES、3DES、SM4 的所有必要模式（ECB、CBC、CMAC 等）
3. 现有的 Obsidian 插件架构支持第三方库集成

### 设计决策
1. **库选择**：crypto-js vs forge vs 自研 → 选择 crypto-js
2. **用户体验**：严格验证 vs 自动适配 vs 警告允许 → 选择警告允许
3. **实现方式**：AES 模拟 vs 第三方库 vs 自研 → 选择第三方库

### 兼容性约束
- 必须保持现有 API 接口不变
- 不能破坏现有的 AES 算法支持
- UI 配置格式必须保持向后兼容

## 验证步骤

### 功能验证
1. 安装 crypto-js 依赖后重新编译
2. 在 Obsidian 中测试 CMAC 操作：
   - AES 算法（确保未破坏现有功能）
   - DES 算法（新恢复功能）
   - 3DES 算法（新恢复功能）
   - SM4 算法（新恢复功能）
3. 在 Obsidian 中测试 CBC-MAC 操作：
   - AES 算法（确保未破坏现有功能）
   - DES 算法（新恢复功能）
   - SM4 算法（新恢复功能）

### 兼容性验证
1. 检查编译后的插件大小变化
2. 验证所有现有的 MAC 操作功能正常
3. 确保 UI 配置正确显示所有算法选项

### 性能验证
1. 测试各算法的执行速度
2. 验证大文件处理性能
3. 检查内存使用情况

## 实施顺序

1. **依赖安装**：添加 crypto-js 到 package.json
2. **CMAC 实现**：恢复 DES/3DES/SM4 支持
3. **CBC-MAC 实现**：恢复 DES/SM4 支持
4. **UI 恢复**：恢复算法选项显示
5. **测试验证**：全面测试所有功能
6. **部署发布**：编译并部署到 Obsidian

## 风险评估

### 技术风险
- crypto-js 可能在某些 Obsidian 环境中不兼容
- 增加的库体积可能影响插件加载性能
- 算法实现可能与标准存在差异

### 缓解措施
- 充分测试 crypto-js 在 Obsidian 环境中的兼容性
- 监控插件大小和加载时间
- 添加算法版本和使用说明
- 提供回退机制（保留 AES 作为默认推荐）

## 成功标准

1. ✅ CMAC 操作支持 AES、DES、3DES、SM4 四种算法
2. ✅ CBC-MAC 操作支持 AES、DES、SM4 三种算法
3. ✅ 所有算法都使用真正的加密实现，而非 AES 模拟
4. ✅ UI 正确显示所有算法选项
5. ✅ 用户体验友好，有适当的使用说明和警告
6. ✅ 现有功能完全兼容，无破坏性变更