# iina-stream-bitrate

IINA 插件：播放在线视频时，在画面角落显示 YouTube 风格的网络健康度图表（Stream Bitrate HUD）。

## 功能

- **实时下载速度曲线**：读取 mpv `cache-speed`（回退到 `demuxer-bitrate`），绘制滚动图表
- **缓冲健康度**：按缓存时长着色（绿 ≥10s / 黄 3–10s / 红 <3s 或卡顿 / 灰 暂停）
- **播放码率**：当前视频流码率（`video-bitrate`）
- **画质信息**：分辨率档位（按解码高度就近映射 144p–4320p）、编码（av1 / vp9 / hevc / avc1 等）、HDR 状态（读 `options/target-trc`，反映 IINA 实际启用 HDR 而非仅片源标记）
- **快捷键**：`Shift+B` 切换显示（也可通过插件菜单）
- **偏好设置**：图表位置（左/右）、速度单位（自动/固定）

仅在播放网络资源时显示，本地文件自动隐藏。

## 安装

1. 将本目录重命名/复制为 `stream-bitrate.iinaplugin`
2. 放入 `~/Library/Application Support/com.colliderli.iina/plugins/`
3. 重启 IINA，在 设置 → 插件 中启用

## 说明

- 需要支持插件系统的 IINA 版本（1.4+）
- 所有数据来自 mpv 属性，仅反映实际解码/下载状态，不做猜测
- IINA/mpv 不支持杜比视界：DV Profile 8.1 兼容层按 HDR10 显示，Profile 5 色彩异常无法修正
