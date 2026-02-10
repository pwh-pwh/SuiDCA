# Cetus DCA Studio（Sui）

## 项目概览

Cetus DCA Studio 是基于 Sui 的高级定投策略控制台，重点在策略设计、执行和组合管理。

## 功能亮点

- 策略模板（保守 / 均衡 / 激进）
- 多策略管理（保存 / 加载 / 删除）
- 收益可视化（均价曲线 + 价格区间估算）
- DCA 订单管理（创建 / 提取 / 关闭）
- 网络感知 UI（testnet / mainnet）

> 注意：创建 DCA 订单需要 Cetus 官方签名服务生成的 `signature` + `timestamp`。官方签名服务暂未公开文档，因此当前需要手动填入。

## 快速开始

```bash
pnpm install
pnpm dev
```

打开应用后：

- 选择策略模板或手动填参数
- 需要创建订单时填入 `signature` + `timestamp`
- 在“我的 DCA 订单”中管理订单

## 环境变量

在 `packages/frontend/.env.local` 中配置网络包 ID：

```
NEXT_PUBLIC_TESTNET_CONTRACT_PACKAGE_ID=...
```

## Monorepo 结构

- `packages/frontend`: Next.js 前端（App Router）
- `packages/backend`: Move 合约 + Suibase 工具

## 后端（Move 合约）部署

部署合约会自动把 package id 写入 `packages/frontend/.env.local`。

### Localnet（可选）

```bash
pnpm localnet:start
pnpm localnet:deploy
```

### Devnet / Testnet / Mainnet

```bash
pnpm devnet:deploy
# 或：pnpm testnet:deploy
# 或：pnpm mainnet:deploy
```

注意：

- Mainnet 没有水龙头，需要你自己的地址里有足够的 SUI 作为 gas。
- 常用辅助命令：`pnpm devnet:address` / `pnpm testnet:address` / `pnpm mainnet:address` 以及 `pnpm devnet:links` / `pnpm testnet:links` / `pnpm mainnet:links`。
- 如果遇到依赖校验/版本不匹配问题，可使用 `*:deploy:no-dependency-check`（谨慎使用）。
