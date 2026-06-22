# Obsidian Codec

Obsidian Codec 是一个本地运行的 Obsidian 编解码与文本处理插件。它提供可视化操作库、拖拽式操作链、输入输出统计、历史操作链保存，以及常用编码、解码、加解密、哈希、数据格式化、提取分析和 URL/IP 处理能力。

## 功能概览

### 操作链工作流

- 左侧操作库按分类展示所有处理卡片，支持展开和拖拽。
- 中间区域用于组合操作链，支持拖拽排序、禁用步骤、断点调试和立即执行。
- 右侧输入/输出面板实时展示处理内容，并显示字节数、字符数和行数统计。
- 操作链可保存为历史记录，支持加载、重命名和删除。

### 编码

- Base64 编码
- URL 编码
- Hex 编码
- HTML 实体编码
- Unicode 转义编码
- 二进制编码
- 十进制编码
- 转 UTF-8，支持 UTF-8、UTF-16LE、UTF-16BE、Latin1、ASCII

### 解码

- Base64 解码
- URL 解码
- Hex 解码
- HTML 实体解码
- Unicode 转义解码
- JWT 解析
- 二进制解码
- 十进制解码
- UTF-8 转字符集，支持 UTF-8、UTF-16LE、UTF-16BE、Latin1、ASCII

### 哈希

- MD5
- SHA1
- SHA256
- SHA512

### 加密与解密

- AES 加密/解密
- AES-GCM 加密/解密
- DES 加密/解密
- 3DES 加密/解密
- 支持密钥、IV/Nonce、输入输出格式、加密模式和填充方式等配置

### 数据美化

- JSON 美化
- XML 美化
- JavaScript 美化
- JavaScript 压缩
- XML 压缩

### 数据格式

- 查找替换：按用户输入的查找内容批量替换为指定内容。
- 去重：按行去除重复内容。
- 排序：按首字母对输入行排序。
- 首尾添加：按行在行首或行尾添加指定内容，可选择避免重复添加。
- 转大写
- 转小写
- 大小写互转
- 移除空白
- 行转符号：把换行符替换为用户输入的符号。
- 合并为一行
- 自动换行：根据空格拆分为多行。

### 提取分析

- 提取字符串：提取输入中的非空字符串片段，不要求引号包裹。
- 提取行：输出输入内容的行数。
- 提取 IPv4：提取合法 IPv4 地址。
- 提取 URL：提取 URL。
- 提取域名：提取域名。

### URL/IP

- 去协议头：去除 `http://`、`https://` 等协议头。
- 去端口：去除 `:80`、`:443` 等端口号。
- 提取根域名：从子域名或 URL 中提取根域名并去重。
- 展开 CIDR：展开类似 `10.0.0.0/24` 的 IP 段。
- IP 地址格式转换：在点分十进制、十进制、十六进制、八进制之间转换 IPv4 地址。

### 时间日期

- 时间戳转日期
- 日期转时间戳

## 安装

### 手动安装

1. 下载或构建 `main.js`、`manifest.json`、`styles.css`。
2. 将文件放入你的仓库目录：`.obsidian/plugins/obsidian-codec/`。
3. 在 Obsidian 的 **设置 -> 第三方插件** 中启用插件。

### 从源码构建

```bash
npm install
npm run build
```

构建产物位于项目根目录：

- `main.js`
- `manifest.json`
- `styles.css`

本地测试仓库部署：

```bash
npm run deploy
```

## 使用方式

1. 通过侧边栏图标或命令面板打开 Codec 视图。
2. 从左侧操作库选择需要的卡片，拖入中间操作链。
3. 根据卡片要求填写配置项，例如查找替换内容、字符集、密钥、IP 格式等。
4. 在右侧输入框粘贴待处理内容。
5. 点击执行，或勾选立即执行自动刷新输出。
6. 需要复用时保存操作链，可在历史记录中再次加载、重命名或删除。

## 命令

- 打开 Codec
- 发送选中内容到 Codec
- 快速 Base64 编码
- 快速 Base64 解码
- 移动选中内容到 Codec 输入框

## 开发

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run lint
npm run build
```

项目使用 TypeScript、esbuild、Vitest 和 ESLint。插件入口为 `src/main.ts`，操作实现位于 `src/operations/implementations/`，操作注册表位于 `src/operations/registry.ts`。

## 发布产物

Obsidian 插件发布时需要包含：

- `main.js`
- `manifest.json`
- `styles.css`

不要发布 `node_modules/` 或测试、源码构建缓存。

## 许可

MIT，详见 [LICENSE](LICENSE)。
