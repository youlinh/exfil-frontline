# 撤离前线

《撤离前线》是一款浏览器 3D 第一人称撤离游戏。好友可以在同一局域网组队，每局的小队有六个位置，空缺由 AI 队友补齐。三张地图均可空手撤离，成功后自动进入商店。

**[在浏览器直接玩](https://youlinh.github.io/exfil-frontline/)**。GitHub Pages 提供单人游玩入口，好友组队需要房主启动下面的局域网房间服务。

## 下载与联机

1. 从 [GitHub Releases](https://github.com/youlinh/exfil-frontline/releases/latest) 下载 `Exfil-Frontline-LAN.zip`，完整解压。房主需要 Node.js 18 或更高版本，好友只需要支持 WebGL 2 的浏览器。
2. Windows 双击 `start-room-windows.bat`。macOS / Linux 在解压目录运行 `node room-server.cjs`。默认端口为 `8080`，占用时可运行 `node room-server.cjs 8081`。
3. 房主在浏览器打开终端显示的 Wi-Fi 或有线局域网地址，点「邀请好友」→「创建房间」，把邀请链接发给同一网络的好友。
4. 好友打开链接，填昵称并加入。也可以从相同局域网地址打开大厅，填入六位房间码。玩家齐了后由房主点「开始游戏」。

房主需保持服务器运行。双击 `index.html` 可离线单人游玩。存档保存在浏览器，网址或端口变化后使用相应地址的存档。

## 从源码运行

```sh
cd source
npm ci
npm run build
npm test
npm start -- 8081
```

构建产物在 `source/release`。同一目录内的 `index.html` 和 `room-server.cjs` 应配套使用。按键、撤离和商店玩法见 [游戏说明](README.txt)。人物模型、骨骼和动画的许可及改动记录见 [人物素材署名](CHARACTER-CREDITS.txt)。

`npm run build:pages` 在 `source/pages` 生成静态站点。GitHub Actions 在 `main` 更新后构建并部署到 Pages。
