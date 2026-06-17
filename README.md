# 🐧 AI 企鹅养成 - 大学生思辨成长伙伴

> 在线地址：**[https://penguin-growth-d0gxgysye3ccd5918-1433392690.tcloudbaseapp.com/](https://penguin-growth-d0gxgysye3ccd5918-1433392690.tcloudbaseapp.com/)**

## 部署信息

| 项目 | 详情 |
|------|------|
| 部署平台 | 腾讯云 CloudBase 静态托管 |
| 环境 ID | `penguin-growth-d0gxgysye3ccd5918` |
| 区域 | 上海（ap-shanghai） |
| 域名 | `penguin-growth-d0gxgysye3ccd5918-1433392690.tcloudbaseapp.com` |
| 部署时间 | 2026-06-13（v3.5.3 缓存破坏版） |

## CloudBase 控制台入口

- [环境概览](https://tcb.cloud.tencent.com/dev?envId=penguin-growth-d0gxgysye3ccd5918#/overview)
- [静态托管](https://tcb.cloud.tencent.com/dev?envId=penguin-growth-d0gxgysye3ccd5918#/static-hosting)

## 🚀 部署流程（缓存破坏版）

项目使用**内容哈希缓存破坏**（Cache Busting）机制，每次部署自动生成带哈希的新文件名，彻底绕过 CDN 缓存。

```bash
# 1. 生成带哈希的资源文件 + 更新 index.html 引用
node scripts/build-cache-bust.js

# 2. 上传 index.html + 所有 js/*.hash.js + css/*.hash.css 到静态托管
#    新文件名完全不同，CDN 无缓存，立即生效 ✅
```

> 💡 每次代码修改后，只需运行这两步即可确保云端总是最新版本。

## 项目简介

基于 AI 的企鹅养成应用，陪伴大学生四年成长，通过思辨对话提升批判性思维能力。
