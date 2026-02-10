'use client'

import { CetusDcaSDK, type DcaOrder, type OpenDcaOrderParams } from '@cetusprotocol/dca-sdk'
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit'
import { Button, Card, Flex, Select, Text, TextArea, TextField } from '@radix-ui/themes'
import useNetworkType from '@suiware/kit/useNetworkType'
import useTransact from '@suiware/kit/useTransact'
import { useEffect, useMemo, useState } from 'react'
import CustomConnectButton from '~~/components/CustomConnectButton'
import Loading from '~~/components/Loading'
import { EXPLORER_URL_VARIABLE_NAME } from '~~/config/network'
import { notification } from '~~/helpers/notification'
import { transactionUrl } from '~~/helpers/network'
import useNetworkConfig from '~~/hooks/useNetworkConfig'

type CoinWhiteList = {
  in_coin_list: string[]
  out_coin_list: string[]
}

type StrategyTemplate = {
  id: string
  name: string
  cycleCount: string
  cycleFrequency: string
  perCycleMinOutAmount: string
  perCycleMaxOutAmount: string
}

type StrategyDraft = {
  id: string
  name: string
  inCoinType: string
  outCoinType: string
  totalInAmount: string
  cycleCount: string
  cycleFrequency: string
  perCycleMinOutAmount: string
  perCycleMaxOutAmount: string
  perCycleInAmountLimit: string
  feeRate: string
}

const DEFAULT_IN_COIN =
  '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
const DEFAULT_STRATEGY_NAME = 'DCA Strategy'

const DcaDashboard = () => {
  const currentAccount = useCurrentAccount()
  const suiClient = useSuiClient()
  const { networkType } = useNetworkType()
  const { useNetworkVariable } = useNetworkConfig()
  const explorerUrl = useNetworkVariable(EXPLORER_URL_VARIABLE_NAME)

  const env = networkType === 'mainnet' ? 'mainnet' : 'testnet'
  const isSupportedNetwork = networkType === 'mainnet' || networkType === 'testnet'

  const sdk = useMemo(() => {
    return CetusDcaSDK.createSDK({ env, sui_client: suiClient })
  }, [env, suiClient])

  const [notificationId, setNotificationId] = useState<string>()
  const [whitelist, setWhitelist] = useState<CoinWhiteList>({
    in_coin_list: [],
    out_coin_list: [],
  })
  const [orders, setOrders] = useState<DcaOrder[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [whitelistWarning, setWhitelistWarning] = useState<string | null>(null)

  const [inCoinType, setInCoinType] = useState<string>(DEFAULT_IN_COIN)
  const [outCoinType, setOutCoinType] = useState<string>('')
  const [totalInAmount, setTotalInAmount] = useState<string>('1000000000')
  const [cycleCount, setCycleCount] = useState<string>('4')
  const [cycleFrequency, setCycleFrequency] = useState<string>('600')
  const [perCycleMinOutAmount, setPerCycleMinOutAmount] = useState<string>('0')
  const [perCycleMaxOutAmount, setPerCycleMaxOutAmount] = useState<string>('0')
  const [perCycleInAmountLimit, setPerCycleInAmountLimit] = useState<string>('0')
  const [feeRate, setFeeRate] = useState<string>('0')
  const [signature, setSignature] = useState<string>('')
  const [timestamp, setTimestamp] = useState<string>('')
  const [strategyName, setStrategyName] = useState<string>(DEFAULT_STRATEGY_NAME)
  const [strategies, setStrategies] = useState<StrategyDraft[]>([])

  const { transact } = useTransact({
    onBeforeStart: () => {
      const nId = notification.txLoading()
      setNotificationId(nId)
    },
    onSuccess: (data) => {
      notification.txSuccess(transactionUrl(explorerUrl, data.digest), notificationId)
      void refreshOrders()
    },
    onError: (e: Error) => {
      notification.txError(e, null, notificationId)
    },
  })

  useEffect(() => {
    if (currentAccount?.address) {
      sdk.setSenderAddress(currentAccount.address)
    }
  }, [currentAccount?.address, sdk])

  useEffect(() => {
    if (!currentAccount || !isSupportedNetwork) return
    void refreshAll()
  }, [currentAccount, isSupportedNetwork])

  useEffect(() => {
    if (whitelist.in_coin_list.length > 0 && !whitelist.in_coin_list.includes(inCoinType)) {
      setInCoinType(whitelist.in_coin_list[0])
    }
    if (whitelist.out_coin_list.length > 0 && !whitelist.out_coin_list.includes(outCoinType)) {
      setOutCoinType(whitelist.out_coin_list[0])
    }
  }, [whitelist, inCoinType, outCoinType])

  const refreshAll = async () => {
    setIsLoading(true)
    setError(null)
    setWhitelistWarning(null)
    try {
      try {
        const list = await sdk.Dca.getDcaCoinWhiteList(3)
        setWhitelist(list)
      } catch (err) {
        // Optional debug for local dev
        console.error('Failed to load DCA whitelist', err)
        setWhitelistWarning(formatError(err))
      }
      await refreshOrders()
    } catch (err) {
      console.error('Failed to load DCA data', err)
      setError(formatError(err))
    } finally {
      setIsLoading(false)
    }
  }

  const refreshOrders = async () => {
    if (!currentAccount) return
    try {
      const res = await sdk.Dca.getDcaOrders(currentAccount.address)
      setOrders(res.data || [])
    } catch (err) {
      const message = formatError(err)
      // Cetus SDK throws when user has no order table yet.
      if (message.includes("reading 'value'")) {
        setOrders([])
        return
      }
      console.error('Failed to load DCA orders', err)
      setError(message)
    }
  }

  const templates: StrategyTemplate[] = [
    {
      id: 'conservative',
      name: '保守',
      cycleCount: '12',
      cycleFrequency: '86400',
      perCycleMinOutAmount: '0',
      perCycleMaxOutAmount: '0',
    },
    {
      id: 'balanced',
      name: '均衡',
      cycleCount: '6',
      cycleFrequency: '43200',
      perCycleMinOutAmount: '0',
      perCycleMaxOutAmount: '0',
    },
    {
      id: 'aggressive',
      name: '激进',
      cycleCount: '3',
      cycleFrequency: '21600',
      perCycleMinOutAmount: '0',
      perCycleMaxOutAmount: '0',
    },
  ]

  const applyTemplate = (template: StrategyTemplate) => {
    setCycleCount(template.cycleCount)
    setCycleFrequency(template.cycleFrequency)
    setPerCycleMinOutAmount(template.perCycleMinOutAmount)
    setPerCycleMaxOutAmount(template.perCycleMaxOutAmount)
  }

  const saveStrategy = () => {
    const draft: StrategyDraft = {
      id: crypto.randomUUID(),
      name: strategyName.trim().length > 0 ? strategyName.trim() : DEFAULT_STRATEGY_NAME,
      inCoinType,
      outCoinType,
      totalInAmount,
      cycleCount,
      cycleFrequency,
      perCycleMinOutAmount,
      perCycleMaxOutAmount,
      perCycleInAmountLimit,
      feeRate,
    }
    setStrategies((prev) => [draft, ...prev])
  }

  const loadStrategy = (draft: StrategyDraft) => {
    setStrategyName(draft.name)
    setInCoinType(draft.inCoinType)
    setOutCoinType(draft.outCoinType)
    setTotalInAmount(draft.totalInAmount)
    setCycleCount(draft.cycleCount)
    setCycleFrequency(draft.cycleFrequency)
    setPerCycleMinOutAmount(draft.perCycleMinOutAmount)
    setPerCycleMaxOutAmount(draft.perCycleMaxOutAmount)
    setPerCycleInAmountLimit(draft.perCycleInAmountLimit)
    setFeeRate(draft.feeRate)
  }

  const deleteStrategy = (id: string) => {
    setStrategies((prev) => prev.filter((strategy) => strategy.id !== id))
  }

  const handleCreateOrder = async () => {
    if (!currentAccount) return
    const finalTimestamp =
      timestamp.trim().length > 0 ? Number(timestamp) : Math.floor(Date.now() / 1000)
    const cycleCountNumber = Number(cycleCount)
    const cycleFrequencyNumber = Number(cycleFrequency)

    const inAmount = totalInAmount.trim()
    const perCycleIn =
      perCycleInAmountLimit.trim() !== '0'
        ? perCycleInAmountLimit.trim()
        : cycleCountNumber > 0
          ? Math.floor(Number(inAmount) / cycleCountNumber).toString()
          : '0'

    const params: OpenDcaOrderParams = {
      in_coin_type: inCoinType,
      out_coin_type: outCoinType,
      in_coin_amount: inAmount,
      cycle_frequency: cycleFrequencyNumber,
      cycle_count: cycleCountNumber,
      per_cycle_min_out_amount: perCycleMinOutAmount.trim(),
      per_cycle_max_out_amount: perCycleMaxOutAmount.trim(),
      per_cycle_in_amount_limit: perCycleIn,
      fee_rate: Number(feeRate),
      timestamp: finalTimestamp,
      signature: signature.trim(),
    }

    const tx = await sdk.Dca.dcaOpenOrderPayload(params)
    transact(tx)
  }

  const handleWithdraw = async (order: DcaOrder) => {
    const tx = await sdk.Dca.withdrawPayload({
      in_coin_type: order.in_coin_type,
      out_coin_type: order.out_coin_type,
      order_id: order.id,
    })
    transact(tx)
  }

  const handleClose = (order: DcaOrder) => {
    const tx = sdk.Dca.dcaCloseOrderPayload([
      {
        order_id: order.id,
        in_coin_type: order.in_coin_type,
        out_coin_type: order.out_coin_type,
      },
    ])
    transact(tx)
  }

  if (!currentAccount) return <CustomConnectButton />

  if (!isSupportedNetwork) {
    return (
      <div className="mx-auto w-full max-w-2xl px-3 py-2 text-center text-red-400">
        Cetus DCA 仅支持 mainnet / testnet。请切换网络后再试。
      </div>
    )
  }

  if (isLoading) return <Loading />
  if (error) return <div className="text-center text-red-400">{error}</div>

  const perCycleHint =
    Number(cycleCount) > 0
      ? Math.floor(Number(totalInAmount) / Number(cycleCount)).toString()
      : '0'

  const canCreate =
    inCoinType &&
    outCoinType &&
    totalInAmount.trim().length > 0 &&
    Number(cycleCount) > 0 &&
    Number(cycleFrequency) > 0 &&
    signature.trim().length > 0

  const selectInCoin =
    whitelist.in_coin_list.length > 0 ? inCoinType : DEFAULT_IN_COIN
  const selectOutCoin =
    whitelist.out_coin_list.length > 0 ? outCoinType : ''

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <Card>
        <Flex direction="column" gap="4">
          <Text size="6" weight="bold">
            Cetus DCA 策略管家（MVP）
          </Text>
          <Text size="2" color="gray">
            提供策略创建、订单查看与提取/关闭。创建订单需要价格签名与时间戳。
          </Text>

          <Flex gap="3" wrap="wrap">
            <TextField.Root
              className="min-w-[200px] flex-1"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              placeholder="策略名称"
            />
            <Button variant="soft" onClick={saveStrategy}>
              保存为策略
            </Button>
          </Flex>

          <Flex gap="2" wrap="wrap">
            {templates.map((template) => (
              <Button
                key={template.id}
                size="2"
                variant="soft"
                onClick={() => applyTemplate(template)}
              >
                {template.name}模板
              </Button>
            ))}
          </Flex>

          <Flex gap="3" wrap="wrap">
            <div className="min-w-[220px] flex-1">
              <Text size="2">输入币种 (in)</Text>
              {whitelist.in_coin_list.length > 0 ? (
                <Select.Root
                  value={selectInCoin}
                  onValueChange={(value) => setInCoinType(value)}
                >
                  <Select.Trigger className="w-full" />
                  <Select.Content>
                    {whitelist.in_coin_list.map((coin) => (
                      <Select.Item key={coin} value={coin}>
                        {shortenType(coin)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              ) : (
                <TextField.Root
                  value={inCoinType}
                  onChange={(e) => setInCoinType(e.target.value)}
                  placeholder="输入币种类型"
                />
              )}
            </div>

            <div className="min-w-[220px] flex-1">
              <Text size="2">输出币种 (out)</Text>
              {whitelist.out_coin_list.length > 0 ? (
                <Select.Root
                  value={selectOutCoin}
                  onValueChange={(value) => setOutCoinType(value)}
                >
                  <Select.Trigger className="w-full" />
                  <Select.Content>
                    {whitelist.out_coin_list.map((coin) => (
                      <Select.Item key={coin} value={coin}>
                        {shortenType(coin)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              ) : (
                <TextField.Root
                  value={outCoinType}
                  onChange={(e) => setOutCoinType(e.target.value)}
                  placeholder="输入币种类型"
                />
              )}
            </div>
          </Flex>

          <Flex gap="3" wrap="wrap">
            <TextField.Root
              className="min-w-[180px] flex-1"
              value={totalInAmount}
              onChange={(e) => setTotalInAmount(e.target.value)}
              placeholder="总投入（最小单位）"
            />
            <TextField.Root
              className="min-w-[160px]"
              value={cycleCount}
              onChange={(e) => setCycleCount(e.target.value)}
              placeholder="周期次数"
            />
            <TextField.Root
              className="min-w-[160px]"
              value={cycleFrequency}
              onChange={(e) => setCycleFrequency(e.target.value)}
              placeholder="周期频率（秒）"
            />
          </Flex>

          <Text size="2" color="gray">
            建议每周期投入（自动估算）：{perCycleHint}
          </Text>
          {whitelistWarning ? (
            <Text size="2" color="red">
              白名单读取失败：{whitelistWarning}（可手动填写币种）
            </Text>
          ) : null}

          <Flex gap="3" wrap="wrap">
            <TextField.Root
              className="min-w-[200px] flex-1"
              value={perCycleMinOutAmount}
              onChange={(e) => setPerCycleMinOutAmount(e.target.value)}
              placeholder="每周期最小输出"
            />
            <TextField.Root
              className="min-w-[200px] flex-1"
              value={perCycleMaxOutAmount}
              onChange={(e) => setPerCycleMaxOutAmount(e.target.value)}
              placeholder="每周期最大输出"
            />
            <TextField.Root
              className="min-w-[200px] flex-1"
              value={perCycleInAmountLimit}
              onChange={(e) => setPerCycleInAmountLimit(e.target.value)}
              placeholder="每周期输入上限（0=自动）"
            />
          </Flex>

          <Flex gap="3" wrap="wrap">
            <TextField.Root
              className="min-w-[200px] flex-1"
              value={feeRate}
              onChange={(e) => setFeeRate(e.target.value)}
              placeholder="费率（默认为 0）"
            />
            <TextField.Root
              className="min-w-[200px] flex-1"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
              placeholder="时间戳（秒，留空自动）"
            />
          </Flex>

          <TextArea
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="价格签名（signature）"
            rows={3}
          />

          <Flex gap="3" justify="between" align="center">
            <Button onClick={handleCreateOrder} disabled={!canCreate}>
              创建 DCA 订单
            </Button>
            <Button variant="soft" onClick={refreshAll}>
              刷新数据
            </Button>
          </Flex>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="4">
          <Flex justify="between" align="center">
            <Text size="5" weight="bold">
              我的 DCA 订单
            </Text>
            <Button variant="soft" onClick={refreshOrders}>
              刷新订单
            </Button>
          </Flex>

          {orders.length === 0 ? (
            <Text size="2" color="gray">
              暂无订单。创建后会显示在这里。
            </Text>
          ) : (
            <div className="flex flex-col gap-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col gap-2 rounded-md border border-sds-blue/30 bg-black/10 p-3"
                >
                  <Text size="2" weight="bold">
                    {shortenId(order.id)} · {order.status}
                  </Text>
                  <Text size="2" color="gray">
                    {shortenType(order.in_coin_type)} → {shortenType(order.out_coin_type)}
                  </Text>
                  <Text size="2">
                    in_balance: {order.in_balance} · out_balance: {order.out_balance}
                  </Text>
                  <Text size="2" color="gray">
                    next_cycle_at: {order.next_cycle_at}
                  </Text>
                  <Flex gap="2">
                    <Button size="2" variant="soft" onClick={() => handleWithdraw(order)}>
                      提取
                    </Button>
                    <Button size="2" color="red" onClick={() => handleClose(order)}>
                      关闭
                    </Button>
                  </Flex>
                </div>
              ))}
            </div>
          )}
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="4">
          <Text size="5" weight="bold">
            策略组合管理
          </Text>
          {strategies.length === 0 ? (
            <Text size="2" color="gray">
              暂无策略。你可以保存当前配置为策略，并在这里快速切换。
            </Text>
          ) : (
            <div className="flex flex-col gap-3">
              {strategies.map((strategy) => (
                <div
                  key={strategy.id}
                  className="flex flex-col gap-2 rounded-md border border-sds-blue/30 bg-black/10 p-3"
                >
                  <Text size="3" weight="bold">
                    {strategy.name}
                  </Text>
                  <Text size="2" color="gray">
                    {shortenType(strategy.inCoinType)} → {shortenType(strategy.outCoinType)}
                  </Text>
                  <Text size="2">
                    总投入 {strategy.totalInAmount} · 次数 {strategy.cycleCount} · 周期{' '}
                    {strategy.cycleFrequency}s
                  </Text>
                  <Flex gap="2">
                    <Button size="2" variant="soft" onClick={() => loadStrategy(strategy)}>
                      加载
                    </Button>
                    <Button size="2" color="red" onClick={() => deleteStrategy(strategy.id)}>
                      删除
                    </Button>
                  </Flex>
                </div>
              ))}
            </div>
          )}
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="4">
          <Text size="5" weight="bold">
            收益可视化（估算）
          </Text>
          <Text size="2" color="gray">
            使用你的配置估算成本区间与每周期均价走势（不代表真实成交）。
          </Text>
          <PriceBandChart
            totalInAmount={totalInAmount}
            cycleCount={cycleCount}
            minOut={perCycleMinOutAmount}
            maxOut={perCycleMaxOutAmount}
          />
        </Flex>
      </Card>
    </div>
  )
}

const shortenId = (id: string) => `${id.slice(0, 6)}...${id.slice(-4)}`

const formatError = (err: unknown) => {
  if (err instanceof Error) {
    return err.message || 'Unknown error'
  }
  if (typeof err === 'string') return err
  try {
    return JSON.stringify(err)
  } catch {
    return 'Unknown error'
  }
}

const shortenType = (type: string) => {
  if (!type) return ''
  const parts = type.split('::')
  const address = parts[0]
  return `${address.slice(0, 6)}...${address.slice(-4)}::${parts.slice(1).join('::')}`
}

const PriceBandChart = ({
  totalInAmount,
  cycleCount,
  minOut,
  maxOut,
}: {
  totalInAmount: string
  cycleCount: string
  minOut: string
  maxOut: string
}) => {
  const count = Math.max(Number(cycleCount) || 1, 1)
  const perCycleIn = Number(totalInAmount) / count || 0
  const min = Number(minOut) || 0
  const max = Number(maxOut) || 0

  const points = Array.from({ length: count }, (_, idx) => {
    const x = (idx / Math.max(count - 1, 1)) * 100
    const minPrice = max > 0 ? perCycleIn / max : 0
    const maxPrice = min > 0 ? perCycleIn / min : 0
    const avgPrice =
      minPrice > 0 && maxPrice > 0 ? (minPrice + maxPrice) / 2 : perCycleIn
    return { x, minPrice, maxPrice, avgPrice }
  })

  const normalize = (value: number, maxValue: number) => {
    if (maxValue === 0) return 0
    return 100 - (value / maxValue) * 100
  }

  const maxPrice = Math.max(...points.map((point) => point.maxPrice || 0), 1)
  const line = points
    .map((point) => `${point.x},${normalize(point.avgPrice, maxPrice)}`)
    .join(' ')
  const band = points
    .map((point) => `${point.x},${normalize(point.maxPrice || point.avgPrice, maxPrice)}`)
    .join(' ')
  const bandBottom = points
    .slice()
    .reverse()
    .map((point) => `${point.x},${normalize(point.minPrice || point.avgPrice, maxPrice)}`)
    .join(' ')

  return (
    <div className="w-full rounded-md border border-sds-blue/30 bg-black/10 p-4">
      <svg viewBox="0 0 100 100" className="h-48 w-full">
        <polygon
          points={`${band} ${bandBottom}`}
          fill="rgba(255,255,255,0.08)"
          stroke="none"
        />
        <polyline
          points={line}
          fill="none"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="1.5"
        />
      </svg>
      <Text size="2" color="gray">
        价格区间基于每周期投入与最小/最大输出估算。
      </Text>
    </div>
  )
}

export default DcaDashboard
