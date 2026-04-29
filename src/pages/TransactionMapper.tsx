import React, { useCallback, useEffect, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { toast } from 'react-toastify'
import { webhooksService } from '../services/webhooks.service'

export const TransaçãoMapper: React.FC = () => {
  const [transactionId, setTransaçãoId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any | null>(null)
  const [activeReference, setActiveReference] = useState('')
  const [resendingId, setResendingId] = useState<number | null>(null)

  const fetchMapping = useCallback(async (reference: string, options?: { silent?: boolean }) => {
    const tx = String(reference || '').trim()
    if (!tx) return

    const silent = Boolean(options?.silent)

    try {
      if (!silent) setLoading(true)
      const res = await webhooksService.mapTransação(tx)
      setResult(res || null)
    } catch (err) {
      console.error('Erro ao mapear transao', err)
      setResult(null)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const handleMapTransação = async () => {
    const tx = transactionId.trim()
    if (!tx) return

    setActiveReference(tx)
    await fetchMapping(tx)
  }

  const handleResendWebhook = async (id: number) => {
    try {
      setResendingId(id)
      await webhooksService.resend([id])
      toast.success('Webhook reenviado com sucesso.')
      if (activeReference) {
        await fetchMapping(activeReference, { silent: true })
      }
    } catch (err) {
      console.error('Erro ao reenviar webhook', err)
    } finally {
      setResendingId(null)
    }
  }

  useEffect(() => {
    if (!activeReference) return

    const intervalId = window.setInterval(() => {
      fetchMapping(activeReference, { silent: true })
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [activeReference, fetchMapping])

  return (
    <div className="bg-slate-950 text-slate-50 rounded-2xl p-6 space-y-6 min-h-[400px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Mapeador de Transação</h1>
        <div className="text-xs text-slate-400">Rastreia origem do webhook por referência da transao</div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={transactionId}
              onChange={(e) => setTransaçãoId(e.target.value)}
              placeholder="merOrderNo / orderNo / tradeNo / transactionId"
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs outline-none"
            />
          </div>
          <button
            onClick={handleMapTransação}
            disabled={loading || !transactionId.trim()}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-xs font-semibold inline-flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Mapear
          </button>
        </div>

        {result && (
          <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 space-y-2 text-xs">
            {!result?.mapped ? (
              <div className="text-amber-300">Nenhum log encontrado para a referência consultada.</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
                  <div className="rounded-md border border-slate-800 p-2">
                    <div className="text-slate-400">Referncia</div>
                    <div className="font-mono text-slate-100 truncate">{result?.mapped?.reference || '-'}</div>
                  </div>
                  <div className="rounded-md border border-slate-800 p-2">
                    <div className="text-slate-400">Usurio origem</div>
                    <div className="text-slate-100 truncate">{result?.mapped?.sourceUser?.name || '-'}</div>
                    <div className="text-slate-400 truncate">ID: {result?.mapped?.sourceUser?.id || '-'}</div>
                  </div>
                  <div className="rounded-md border border-slate-800 p-2">
                    <div className="text-slate-400">Webhook URL</div>
                    <div className="text-slate-100 truncate" title={result?.mapped?.origin?.targetUrl || ''}>
                      {result?.mapped?.origin?.targetUrl || '-'}
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-800 p-2">
                    <div className="text-slate-400">Status</div>
                    <div className="text-slate-100">{result?.mapped?.origin?.status || '-'}</div>
                    <div className="text-slate-400">HTTP: {result?.mapped?.origin?.httpStatus ?? '-'}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <div className="rounded-md border border-slate-800 p-2"><span className="text-slate-400">Logs</span><div className="text-slate-100 font-semibold">{result?.mapped?.stats?.totalLogs ?? 0}</div></div>
                  <div className="rounded-md border border-slate-800 p-2"><span className="text-slate-400">Entregues</span><div className="text-emerald-300 font-semibold">{result?.mapped?.stats?.delivered ?? 0}</div></div>
                  <div className="rounded-md border border-slate-800 p-2"><span className="text-slate-400">Falhas</span><div className="text-rose-300 font-semibold">{result?.mapped?.stats?.failed ?? 0}</div></div>
                  <div className="rounded-md border border-slate-800 p-2"><span className="text-slate-400">Primeiro log</span><div className="text-slate-100">{result?.mapped?.stats?.firstSeen ? new Date(result.mapped.stats.firstSeen).toLocaleString() : '-'}</div></div>
                  <div className="rounded-md border border-slate-800 p-2"><span className="text-slate-400">ltimo log</span><div className="text-slate-100">{result?.mapped?.stats?.lastSeen ? new Date(result.mapped.stats.lastSeen).toLocaleString() : '-'}</div></div>
                </div>

                <div className="rounded-md border border-slate-800 p-2">
                  <div className="text-slate-300 font-semibold mb-2">Timeline recente</div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {(result?.logs || []).slice(0, 40).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between gap-2 text-[11px] border-b border-slate-900 pb-1">
                        <span className="text-slate-400">#{item.id}</span>
                        <span className="text-slate-200 truncate flex-1">{item.event_type || '-'}</span>
                        <span className="text-slate-300">{item.status || '-'}</span>
                        <span className="text-slate-400">HTTP {item.http_status ?? '-'}</span>
                        <span className="text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleString() : '-'}</span>
                        <button
                          onClick={() => handleResendWebhook(item.id)}
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
    </div>
  )
}

export default TransaçãoMapper

