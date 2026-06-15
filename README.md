# Obsidian Codec - 全能编解码插件

> 为 Obsidian 提供强大的编解码、加密解密、哈希运算和时间日期转换功能的插件

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-green.svg)](https://github.com/obsidianmd/obsidian-releases)

## ✨ 特性

### 🔄 多种编解码操作
- **Base64** - 标准编码/解码
- **URL** - URL编码/解码  
- **Hex** - 十六进制编码/解码
- **HTML Entities** - HTML实体编码/解码
- **Unicode** - Unicode编码/解码
- **JWT** - JWT令牌解码
- **字符集转换** - UTF-8与其他字符集转换

### 🔐 加密解密功能
- **AES加密** - 支持CBC/ECB/CTR模式
- **AES-GCM加密** - 现代化认证加密
- **DES加密** - 经典对称加密
- **3DES加密** - 三重DES加密
- **多种格式支持** - Hex/Raw/Base64格式
- **可配置参数** - 密钥、IV、填充模式等

### 🎯 哈希运算
- **MD5** - 快速哈希
- **SHA1** - 安全哈希算法
- **SHA256** - 安全哈希标准
- **SHA512** - 高强度哈希

### 🕐 时间日期转换
- **时间戳转日期** - Unix时间戳转换为可读日期
- **日期转时间戳** - 日期转换为Unix时间戳

### 🛠️ 数据美化
- **JSON美化** - 格式化JSON数据
- **XML美化** - 格式化XML数据

### ⚡ 核心功能
- **可视化操作链** - 拖拽构建多步骤操作序列
- **实时执行** - 支持即时执行模式
- **状态管理** - 操作状态跟踪和调试
- **断点功能** - 设置断点进行调试
- **保存/加载** - 保存常用操作链
- **拖拽排序** - 灵活调整操作顺序

## 📸 功能预览

### 主界面
- 左侧操作面板：所有可用操作分类展示
- 中间工作区：构建和管理操作链
- 右侧输入输出：实时查看处理结果

### 操作分类
- **编码** - 各种编码格式转换
- **解码** - 解码操作
- **哈希** - 哈希值计算
- **加密** - 数据加密操作
- **解密** - 数据解密操作
- **数据美化** - 数据格式化
- **时间日期** - 时间转换
- **自定义** - 自定义操作

## 🚀 安装方法

### 方法1：通过Obsidian社区插件市场
1. 打开Obsidian设置 → 社区插件
2. 浏览插件市场搜索 "Codec"
3. 点击安装并启用

### 方法2：手动安装
1. 下载最新版本的 `main.js`, `manifest.json`, `styles.css`
2. 将文件复制到你的vault目录：`.obsidian/plugins/obsidian-codec/`
3. 在Obsidian设置中启用插件

### 方法3：从源码构建
```bash
# 克隆仓库
git clone https://github.com/zhangwenbo1229/obsidian-codec.git
cd obsidian-codec

# 安装依赖
npm install

# 构建插件
npm run build

# 将生成的文件复制到你的插件目录
cp main.js manifest.json styles.css ~/.obsidian/plugins/obsidian-codec/
```

## 💡 使用指南

### 基础使用
1. **打开插件**：点击侧边栏Codec图标或使用命令面板
2. **选择操作**：从左侧面板选择需要的操作
3. **构建操作链**：将操作拖拽到中间的工作区域
4. **输入数据**：在右侧输入区域输入要处理的数据
5. **执行处理**：点击"立即执行"按钮或启用自动执行
6. **查看结果**：在右侧输出区域查看处理结果

### 高级功能
- **操作链管理**：保存常用操作链供重复使用
- **断点调试**：在操作链中设置断点进行分步调试
- **拖拽排序**：拖拽操作卡片调整执行顺序
- **快捷命令**：使用Obsidian命令快速执行常用操作

### 快捷命令
- `打开Codec` - 打开Codec视图
- `发送选中内容到Codec` - 将编辑器选中的内容发送到Codec
- `快速Base64编码` - 对选中内容进行Base64编码
- `快速Base64解码` - 对选中内容进行Base64解码

## 🏗️ 项目结构

```
obsidian-codec/
├── src/                          # 源代码目录
│   ├── main.ts                   # 插件主入口
│   ├── codec-view.ts             # 主视图组件
│   ├── operations/               # 操作实现
│   │   ├── registry.ts           # 操作注册表
│   │   ├── base-operation.ts     # 操作基类
│   │   └── implementations/      # 具体操作实现
│   │       ├── encodings/        # 编码操作
│   │       ├── encryption/       # 加密操作
│   │       ├── hashes/           # 哈希操作
│   │       ├── beautify/         # 美化操作
│   │       └── datetime/         # 时间日期操作
│   ├── chain-state/              # 操作链状态管理
│   ├── crypto/                   # 加密提供者
│   ├── icons/                    # 图标资源
│   ├── modal/                    # 模态对话框
│   └── __tests__/                # 测试文件
├── .github/workflows/            # GitHub Actions工作流
├── manifest.json                 # 插件清单
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript配置
└── esbuild.config.mjs            # 构建配置
```

## 🔧 开发指南

### 开发环境
- **Node.js**: v18+
- **包管理器**: npm
- **构建工具**: esbuild
- **测试框架**: Vitest
- **代码规范**: ESLint

### 开发命令
```bash
# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 生产构建
npm run build

# 运行测试
npm run test

# 代码检查
npm run lint

# 部署到本地Obsidian
npm run deploy
```

### 添加新操作
1. 在 `src/operations/implementations/` 中创建新的操作类
2. 继承 `BaseOperation` 并实现必要的方法
3. 在 `src/operations/registry.ts` 中注册新操作
4. 编写单元测试

## 🧪 测试

插件包含完整的单元测试套件：
- 操作功能测试
- 状态管理测试
- UI组件测试
- 集成测试

```bash
# 运行所有测试
npm run test

# 运行特定测试
npm run test -- ui-styles.test.ts

# 生成覆盖率报告
npm run test -- --coverage
```

## 📝 更新日志

### v1.0.0 (最新版本)
- ✅ 完整的编解码功能支持
- ✅ 多种加密算法实现
- ✅ 可视化操作链系统
- ✅ 状态管理和断点功能
- ✅ 时间日期转换功能
- ✅ 优化的UI界面和用户体验

## 🤝 贡献

欢迎贡献代码、报告问题或提出新功能建议！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源 - 详见 [LICENSE](LICENSE) 文件

## 👨‍💻 作者

**zhangwenbo1229** - GitHub: [@zhangwenbo1229](https://github.com/zhangwenbo1229)

## 🙏 致谢

- Obsidian团队提供的优秀笔记软件平台
- CryptoJS项目提供的加密算法支持
- 所有贡献者和使用者的支持

## 📮 反馈与支持

如果你喜欢这个插件，请考虑：
- ⭐ 给仓库点个星
- 🐛 报告问题
- 💡 提出功能建议
- 📢 向其他人推荐这个插件

---

**Made with ❤️ for the Obsidian community**