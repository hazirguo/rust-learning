# Rust 自学站（GitHub Pages 版）

12 周（84 天）Rust 系统学习计划的纯静态站点，无框架、无构建步骤。按每天约 1 小时设计，目标是能读 Firecracker / Cloud Hypervisor 模块源码、能写 async 网关和极简 Agent 沙箱运行器。内容面向有 C/C++ 与 Linux 系统编程背景的学习者。

## 文件结构

- `index.html`：页面骨架
- `styles.css`：样式（暖纸底 + 铁锈橙，响应式，手机无横向滚动）
- `app.js`：原生 JS，`fetch` 加载数据、渲染首页与课程页、处理进度
- `data/lessons.json`：全部内容数据

数据结构：

- `weeks`：12 周路线，每周含 `weekNumber`、`title`、`dateRange`、`topics` 数组、`project`、`acceptance`
- `lessons`：已发布课程数组，每课含 `dayNumber`、`weekNumber`、`title`、`lessonDate`、`goal`、`summary`、`body`（内容块数组，块类型有 paragraph / heading / bullets / code / callout / timeTable / practice）、`quiz`（题目与答案）、`checklist`（验收清单）

学习进度（验收清单勾选、整课完成标记）保存在浏览器 localStorage 里（键名带 `rust-learning` 前缀），换浏览器或清缓存会丢失，属预期行为。

## 本地预览

页面要通过 HTTP 才能读取 `data/lessons.json`，直接双击 `index.html` 会被浏览器拦截。在本目录起一个静态服务器：

```bash
cd rust-learning-site
python3 -m http.server 8000
```

然后浏览器打开 http://localhost:8000 即可。

## 每日更新方式

1. 往 `data/lessons.json` 的 `lessons` 数组追加一课（结构照第 1 天那课写：`dayNumber` 递增、`lessonDate` 填当天日期、正文用内容块、代码示例先用 cargo 实际跑通再写入）。
2. `git add`、`git commit`、`git push` 到 GitHub 仓库。
3. GitHub Pages 会自动重新部署，稍等一两分钟刷新页面即可看到新课，不需要任何构建步骤。

## GitHub Pages 设置（首次）

仓库 Settings → Pages → Build and deployment 选择 Deploy from a branch，分支选 `main`、目录选 `/ (root)`，保存即可。
