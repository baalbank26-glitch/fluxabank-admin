import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Filter, RefreshCw, Search, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { webhooksService } from '../services/webhooks.service'

type WebhookLog = {
  id: number
  created_at: string
  http_status: number | null
  latency_ms: number | null
  target_url: string
  event_type: string | null
  status: string | null
  transaction_id: string | null

  payload?: {
    merOrderNo?: string
    orderNo?: string
    tradeNo?: string
    status?: string
    amount?: number
    netAmount?: number
    feeAmount?: number
    totalAmount?: number
    userId?: number
    type?: string
    externalId?: string
    timestamp?: string
  }
}

type Filters = {
  datePreset: 'today' | '7d' | '30d' | 'all'
  type: string
  status: string
  url: string
  transactionId: string
}

export const WebhooksHistory: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({
    datePreset: 'today',
    type: '',
    status: '',
    url: '',
    transactionId: ''
  })

  const [logs, setLogs] = useState<WebhookLog[]>([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [ledgerId, setLedgerId] = useState<string>('')
  const [triggering, setTriggering] = useState(false)
  const [mapperTransactionId, setMapperTransactionId] = useState('')
  const [mapperLoading, setMapperLoading] = useState(false)
  const [mapperResult, setMapperResult] = useState<any | null>(null)
  const [resendingId, setResendingId] = useState<number | null>(null)
  const debounceTimer = useRef<number | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const queryParams = useMemo(() => {
    const params: any = { page, pageSize }

    const now = new Date()
    let from: Date | null = null

    if (filters.datePreset === 'today') {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (filters.datePreset === '7d') {
      from = new Date(now)
      from.setDate(from.getDate() - 7)
    } else if (filters.datePreset === '30d') {
      from = new Date(now)
      from.setDate(from.getDate() - 30)
    }

    if (from) {
      params.dateFrom = from.toISOString()
      params.dateTo = now.toISOString()
    }

    if (filters.type) params.type = filters.type
    if (filters.status) params.status = filters.status
    if (filters.url) params.url = filters.url
    if (filters.transactionId) params.transactionId = filters.transactionId

    return params
  }, [filters, page, pageSize])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await webhooksService.list(queryParams as any)
      setLogs(res?.data || [])
      setTotal(res?.pagination?.total || 0)
    } catch (err) {
      console.error('Erro ao carregar histórico de webhooks', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [queryParams])

  const toggleSelectAll = () => {
    if (selectedIds.length === logs.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(logs.map((l) => l.id))
    }
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleResend = async (ids: number[] = selectedIds) => {
    try {
      if (!ids.length) return
      const singleId = ids.length === 1 ? ids[0] : null
      setResendingId(singleId)
      await webhooksService.resend(ids)
      if (ids === selectedIds) setSelectedIds([])
      toast.success(ids.length === 1 ? 'Webhook reenviado com sucesso.' : 'Webhooks reenviados com sucesso.')
      fetchData()
    } catch (err) {
      console.error('Erro ao reenviar webhooks', err)
    } finally {
      setResendingId(null)
    }
  }

  const handleTriggerLedgerWebhook = async () => {
    try {
      const idNum = parseInt(ledgerId, 10)
      if (!Number.isFinite(idNum) || idNum <= 0) return
      setTriggering(true)
      await webhooksService.triggerLedger(idNum)
      setLedgerId('')
      fetchData()
    } catch (err) {
      console.error('Erro ao acionar webhook de ledger', err)
    } finally {
      setTriggering(false)
    }
  }

  const handleMapTransaction = async () => {
    try {
      const tx = mapperTransactionId.trim()
      if (!tx) return
      setMapperLoading(true)
      const res = await webhooksService.mapTransaction(tx)
      setMapperResult(res || null)
    } catch (err) {
      console.error('Erro ao mapear transação', err)
      setMapperResult(null)
    } finally {
      setMapperLoading(false)
    }
  }

  const resetFilters = () => {
    setFilters({
      datePreset: 'today',
      type: '',
      status: '',
      url: '',
      transactionId: ''
    })
    setPage(1)
  }

  const updateFilterDebounced = (key: keyof Filters, value: string) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    debounceTimer.current = window.setTimeout(() => {
      setFilters((f) => ({ ...f, [key]: value }))
      setPage(1)
    }, 400)
  }

  const clearFilter = (key: keyof Filters) => {
    setFilters((f) => ({ ...f, [key]: '' }))
    setPage(1)
  }

  return (
    <div className="bg-slate-950 text-slate-50 rounded-2xl p-6 space-y-6 min-h-[400px]">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <h1 className="text-xl font-semibold">Histórico de Webhooks</h1>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="inline-flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900 border border-slate-700">
            <input
              value={ledgerId}
              onChange={(e) => setLedgerId(e.target.value)}
              placeholder="Ledger ID"
              className="w-24 sm:w-28 bg-transparent text-[10px] sm:text-xs outline-none"
              inputMode="numeric"
            />
            <button
              onClick={handleTriggerLedgerWebhook}
              disabled={triggering || !ledgerId}
              className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-[10px] sm:text-xs"
            >
              Acionar Ledger
            </button>
          </div>

          <button
            onClick={() => handleResend(selectedIds)}
            disabled={!selectedIds.length || loading}
            className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-[11px] sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Reenviar webhooks
          </button>
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700">
          <CalendarDays className="w-4 h-4" />
          <select
            value={filters.datePreset}
            onChange={(e) => {
              setFilters((f) => ({ ...f, datePreset: e.target.value as Filters['datePreset'] }))
              setPage(1)
            }}
            className="appearance-none bg-slate-900 text-slate-50 text-xs outline-none px-2 py-1 rounded-md border border-slate-700 focus:border-slate-600"
          >
            <option className="bg-slate-900 text-slate-50" value="today">Hoje</option>
            <option className="bg-slate-900 text-slate-50" value="7d">Últimos 7 dias</option>
            <option className="bg-slate-900 text-slate-50" value="30d">Últimos 30 dias</option>
            <option className="bg-slate-900 text-slate-50" value="all">Todo período</option>
          </select>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700">
          <Filter className="w-4 h-4" />
          <select
            value={filters.type}
            onChange={(e) => {
              setFilters((f) => ({ ...f, type: e.target.value }))
              setPage(1)
            }}
            className="appearance-none bg-slate-900 text-slate-50 text-xs outline-none px-2 py-1 rounded-md border border-slate-700 focus:border-slate-600 min-w-[80px]"
          >
            <option className="bg-slate-900 text-slate-50" value="">Tipo</option>
            <option className="bg-slate-900 text-slate-50" value="PIX_CREATED">PIX_CREATED</option>
            <option className="bg-slate-900 text-slate-50" value="PIX_COMPLETED">PIX_COMPLETED</option>
            <option className="bg-slate-900 text-slate-50" value="PIX_REFUND">PIX_REFUND</option>
          </select>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700">
          <Filter className="w-4 h-4" />
          <select
            value={filters.status}
            onChange={(e) => {
              setFilters((f) => ({ ...f, status: e.target.value }))
              setPage(1)
            }}
            className="appearance-none bg-slate-900 text-slate-50 text-xs outline-none px-2 py-1 rounded-md border border-slate-700 focus:border-slate-600 min-w-[80px]"
          >
            <option className="bg-slate-900 text-slate-50" value="">Status</option>
            <option className="bg-slate-900 text-slate-50" value="SUCCESS">Sucesso</option>
            <option className="bg-slate-900 text-slate-50" value="FAILED">Erro</option>
          </select>
        </div>

        <div className="flex-1 min-w-[180px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            defaultValue={filters.url}
            onChange={(e) => updateFilterDebounced('url', e.target.value)}
            placeholder="URL do Webhook"
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs outline-none"
          />
        </div>

        <div className="flex-1 min-w-[140px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            defaultValue={filters.transactionId}
            onChange={(e) => updateFilterDebounced('transactionId', e.target.value)}
            placeholder="ID da transação"
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs outline-none"
          />
        </div>

        <button
          onClick={resetFilters}
          className="ml-auto text-xs font-semibold text-emerald-400 hover:text-emerald-300"
        >
          Limpar filtros
        </button>
      </div>

      {/* MAPEADOR DE TRANSAÇÃO */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-100">Mapeador de Transação (Webhook)</h2>
          <div className="text-[11px] text-slate-400">Rastreia origem do webhook por referência da transação</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            value={mapperTransactionId}
            onChange={(e) => setMapperTransactionId(e.target.value)}
            placeholder="merOrderNo / orderNo / tradeNo / transactionId"
            className="flex-1 min-w-[260px] px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs outline-none"
          />
          <button
            onClick={handleMapTransaction}
            disabled={mapperLoading || !mapperTransactionId.trim()}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-xs font-semibold inline-flex items-center gap-2"
          >
            {mapperLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Mapear
          </button>
        </div>

        {mapperResult && (
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 space-y-2 text-xs">
            {!mapperResult?.mapped ? (
              <div className="text-amber-300">Nenhum log encontrado para a referência consultada.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                  <div className="rounded-md border border-slate-800 p-2">
                    <div className="text-slate-400">Referência</div>
                    <div className="font-mono text-slate-100 truncate">{mapperResult?.mapped?.reference || '-'}</div>
                  </div>
                  <div className="rounded-md border border-slate-800 p-2">
                    <div className="text-slate-400">Usuário origem</div>
                    <div className="text-slate-100 truncate">{mapperResult?.mapped?.sourceUser?.name || '-'}</div>
                    <div className="text-slate-400 truncate">ID: {mapperResult?.mapped?.sourceUser?.id || '-'}</div>
                  </div>
                  <div className="rounded-md border border-slate-800 p-2">
                    <div className="text-slate-400">Webhook URL</div>
                    <div className="text-slate-100 truncate" title={mapperResult?.mapped?.origin?.targetUrl || ''}>
                      {mapperResult?.mapped?.origin?.targetUrl || '-'}
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-800 p-2">
                    <div className="text-slate-400">Status</div>
                    <div className="text-slate-100">{mapperResult?.mapped?.origin?.status || '-'}</div>
                    <div className="text-slate-400">HTTP: {mapperResult?.mapped?.origin?.httpStatus ?? '-'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="rounded-md border border-slate-800 p-2"><span className="text-slate-400">Logs</span><div className="text-slate-100 font-semibold">{mapperResult?.mapped?.stats?.totalLogs ?? 0}</div></div>
                  <div className="rounded-md border border-slate-800 p-2"><span className="text-slate-400">Entregues</span><div className="text-emerald-300 font-semibold">{mapperResult?.mapped?.stats?.delivered ?? 0}</div></div>
                  <div className="rounded-md border border-slate-800 p-2"><span className="text-slate-400">Falhas</span><div className="text-orange-300 font-semibold">{mapperResult?.mapped?.stats?.failed ?? 0}</div></div>
                  <div className="rounded-md border border-slate-800 p-2"><span className="text-slate-400">Primeiro log</span><div className="text-slate-100">{mapperResult?.mapped?.stats?.firstSeen ? new Date(mapperResult.mapped.stats.firstSeen).toLocaleString() : '-'}</div></div>
                  <div className="rounded-md border border-slate-800 p-2"><span className="text-slate-400">Último log</span><div className="text-slate-100">{mapperResult?.mapped?.stats?.lastSeen ? new Date(mapperResult.mapped.stats.lastSeen).toLocaleString() : '-'}</div></div>
                </div>

                <div className="rounded-md border border-slate-800 p-2">
                  <div className="text-slate-300 font-semibold mb-2">Timeline recente</div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {(mapperResult?.logs || []).slice(0, 20).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-[11px] border-b border-slate-900 pb-1">
                        <span className="text-slate-400">#{item.id}</span>
                        <span className="text-slate-200 truncate flex-1">{item.event_type || '-'}</span>
                        <span className="text-slate-300">{item.status || '-'}</span>
                        <span className="text-slate-400">HTTP {item.http_status ?? '-'}</span>
                        <span className="text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</span>
                        <button
                          onClick={() => handleResend([item.id])}
                          disabled={resendingId === item.id}
                          className="px-2 py-1 rounded-md border border-emerald-500/40 text-[10px] hover:bg-emerald-500/10 disabled:opacity-50"
                        >
                          {resendingId === item.id ? 'Enviando...' : 'Reenviar'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ACTIVE FILTERS */}
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
        {filters.type && (
          <span className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700">
            Tipo: {filters.type}
            <button onClick={() => clearFilter('type')} className="text-slate-400 hover:text-slate-200">×</button>
          </span>
        )}
        {filters.status && (
          <span className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700">
            Status: {filters.status}
            <button onClick={() => clearFilter('status')} className="text-slate-400 hover:text-slate-200">×</button>
          </span>
        )}
        {filters.url && (
          <span className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 max-w-[50%] truncate">
            URL: <span className="truncate">{filters.url}</span>
            <button onClick={() => clearFilter('url')} className="text-slate-400 hover:text-slate-200">×</button>
          </span>
        )}
        {filters.transactionId && (
          <span className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700">
            Tx: {filters.transactionId}
            <button onClick={() => clearFilter('transactionId')} className="text-slate-400 hover:text-slate-200">×</button>
          </span>
        )}
      </div>

      {/* LISTAGEM */}
      <div className="mt-4 bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center px-4 py-2 text-[11px] uppercase tracking-wide text-slate-400 bg-slate-900/80">
          <div className="flex items-center gap-3 w-40">
            <button
              onClick={toggleSelectAll}
              className="w-4 h-4 border border-slate-600 rounded-sm flex items-center justify-center text-[10px]"
            >
              {selectedIds.length === logs.length && logs.length > 0 ? '✓' : ''}
            </button>
            <span className="flex-1 text-center">Data</span>
          </div>
          {/* Desktop columns */}
          <span className="hidden md:block w-32 text-center">ID</span>
          <span className="hidden xl:block w-40 text-center">merOrderNo</span>
          <span className="hidden lg:block w-40 text-center">orderNo</span>
          <span className="hidden lg:block w-40 text-center">tradeNo</span>
          <span className="w-28 text-center">Status</span>
          <span className="hidden sm:block w-28 text-center">Tipo</span>
          <span className="w-28 text-center">Valor</span>
          <span className="hidden md:block w-28 text-center">Taxa</span>
          <span className="hidden xl:block w-28 text-center">Líquido</span>
          <span className="hidden xl:block w-28 text-center">Total</span>
          <span className="hidden xl:block w-28 text-center">User</span>
          <span className="hidden xl:block w-48 text-center">ExternalId</span>
          <span className="w-32 text-center">Ações</span>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Nenhum resultado encontrado.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {logs.map((log) => (
              <div
                key={log.id}
                className="px-4 py-2 text-xs hover:bg-slate-900/80"
              >
                {/* Mobile card layout */}
                <div className="flex md:hidden gap-3">
                  <button
                    onClick={() => toggleSelect(log.id)}
                    className="mt-1 w-4 h-4 border border-slate-600 rounded-sm flex items-center justify-center text-[10px] shrink-0"
                  >
                    {selectedIds.includes(log.id) ? '✓' : ''}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-slate-200 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-emerald-400 text-sm shrink-0">
                            {(() => {
                              const amt =
                                log.payload?.totalAmount ??
                                log.payload?.netAmount ??
                                log.payload?.amount
                              return amt != null ? `R$ ${Number(amt).toFixed(2)}` : 'R$ -'
                            })()}
                          </div>
                          <span className="font-mono truncate block max-w-[150px]">{log.payload?.merOrderNo || log.payload?.orderNo || log.payload?.tradeNo || '-'}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <button
                        onClick={() => navigator.clipboard?.writeText(log.target_url || '')}
                        className="px-2 py-1 rounded-lg border border-slate-700 text-[11px] hover:bg-slate-800 shrink-0"
                        title="Copiar URL do webhook"
                      >
                        Copiar URL
                      </button>
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] shrink-0">
                        {log.payload?.status || '-'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] shrink-0">
                        {log.payload?.type || '-'}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400 truncate" title={log.payload?.externalId || ''}>
                      {log.payload?.externalId || ''}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-slate-500 truncate" title={log.target_url}>{log.target_url}</div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleResend([log.id])}
                          disabled={resendingId === log.id}
                          className="px-2 py-1 rounded-lg border border-emerald-500/40 text-[11px] hover:bg-emerald-500/10 disabled:opacity-50"
                        >
                          {resendingId === log.id ? 'Enviando...' : 'Reenviar'}
                        </button>
                        <button
                          onClick={() => navigator.clipboard?.writeText(log.target_url || '')}
                          className="px-2 py-1 rounded-lg border border-slate-700 text-[11px] hover:bg-slate-800"
                        >
                          Copiar
                        </button>
                        <button
                          onClick={() => toggleSelect(log.id)}
                          className="px-2 py-1 rounded-lg border border-slate-700 text-[11px] hover:bg-slate-800"
                        >
                          Selecionar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop row layout */}
                <div className="hidden md:flex items-center">
                  <div className="flex items-center gap-3 w-40">
                    <button
                      onClick={() => toggleSelect(log.id)}
                      className="w-4 h-4 border border-slate-600 rounded-sm flex items-center justify-center text-[10px]"
                    >
                      {selectedIds.includes(log.id) ? '✓' : ''}
                    </button>
                    <div className="flex flex-col">
                      <span>{new Date(log.created_at).toLocaleDateString()}</span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="hidden md:block w-32 text-center font-mono truncate">{log.id}</div>
                  <div className="hidden xl:block w-40 text-center truncate">{log.payload?.merOrderNo || '-'}</div>
                  <div className="hidden lg:block w-40 text-center truncate">{log.payload?.orderNo || '-'}</div>
                  <div className="hidden lg:block w-40 text-center truncate">{log.payload?.tradeNo || '-'}</div>
                  <div className="w-28 text-center">{log.payload?.status || '-'}</div>
                  <div className="hidden sm:block w-28 text-center">{log.payload?.type || '-'}</div>
                  <div className="w-28 text-center">{log.payload?.amount != null ? Number(log.payload.amount).toFixed(2) : '-'}</div>
                  <div className="hidden md:block w-28 text-center">{log.payload?.feeAmount != null ? Number(log.payload.feeAmount).toFixed(2) : '-'}</div>
                  <div className="hidden xl:block w-28 text-center">{log.payload?.netAmount != null ? Number(log.payload.netAmount).toFixed(2) : '-'}</div>
                  <div className="hidden xl:block w-28 text-center">{log.payload?.totalAmount != null ? Number(log.payload.totalAmount).toFixed(2) : '-'}</div>
                  <div className="hidden xl:block w-28 text-center">{log.payload?.userId || '-'}</div>
                  <div className="hidden xl:block w-48 text-center truncate">{log.payload?.externalId || '-'}</div>
                  <div className="w-32 text-center flex items-center justify-center gap-2">
                    <button
                      onClick={() => toggleSelect(log.id)}
                      className="px-2 py-1 rounded-lg border border-slate-700 text-[11px] hover:bg-slate-800"
                    >
                      Selecionar
                    </button>
                    <button
                      onClick={() => handleResend([log.id])}
                      disabled={resendingId === log.id}
                      className="px-2 py-1 rounded-lg border border-emerald-500/40 text-[11px] hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      {resendingId === log.id ? 'Enviando...' : 'Reenviar'}
                    </button>
                    <button
                      onClick={() => navigator.clipboard?.writeText(log.target_url || '')}
                      className="px-2 py-1 rounded-lg border border-slate-700 text-[11px] hover:bg-slate-800"
                      title="Copiar URL"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PAGINAÇÃO */}
      <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
        <span>
          Página {page} de {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded-lg border border-slate-700 disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded-lg border border-slate-700 disabled:opacity-40"
          >
            Próximo
          </button>
        </div>
      </div>
    </div>
  )
}

export default WebhooksHistory

