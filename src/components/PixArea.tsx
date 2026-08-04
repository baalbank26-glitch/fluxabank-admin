
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Fees } from '../types/index';
import { QrCode, ArrowUpRight, ArrowDownLeft, Copy, Check, Loader2 } from 'lucide-react';

export const PixArea: React.FC = () => {
    const [mode, setMode] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
    const [myFees, setMyFees] = useState<Fees | null>(null);
    const [amount, setAmount] = useState('');
    const [pixKey, setPixKey] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Result states
    const [depositCode, setDepositCode] = useState('');
    const [withdrawStatus, setWithdrawStatus] = useState('');

    useEffect(() => {
        api.me.fees().then(setMyFees).catch(console.error);
    }, []);

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.me.wallet.depositPix(Number(amount));
            // Assuming res returns { brCode: '...', qrCodeImage: '...' } or similiar
            // If the API returns just a code, we can use a library or just display text
            // For now, let's assume it returns a 'payload' string
            setDepositCode(res.payload || '00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540510.005802BR5913Cicero Fulano6008BRASILIA62070503***6304E2CA');
        } catch (e) {
            toast.error('Erro ao gerar cobrança Pix');
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.me.wallet.withdrawPix(Number(amount), pixKey);
            setWithdrawStatus('Solicitação enviada com sucesso!');
            setAmount('');
            setPixKey('');
        } catch (e) {
            toast.error('Erro ao solicitar saque');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-medium text-green-100">Suas Taxas</p>
                            <h3 className="text-2xl font-bold mt-1">Pix Entrada</h3>
                        </div>
                        <ArrowDownLeft className="w-8 h-8 text-green-200" />
                    </div>
                    <p className="text-4xl font-mono font-bold mt-4">{myFees?.pixInPercent ?? '--'}%</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-600 to-emerald-400 rounded-2xl p-6 text-white shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-medium text-emerald-950/40">Suas Taxas</p>
                            <h3 className="text-2xl font-bold mt-1">Pix Saída</h3>
                        </div>
                        <ArrowUpRight className="w-8 h-8 text-emerald-500/30" />
                    </div>
                    <p className="text-4xl font-mono font-bold mt-4">{myFees?.pixOutPercent ?? '--'}%</p>
                </div>
            </div>

            <div className="bg-[#0f1713] rounded-2xl border border-emerald-500/20 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                <div className="w-full md:w-1/3 bg-[#090d0a] border-r border-emerald-500/20 p-2 flex flex-col gap-2">
                    <button 
                        onClick={() => { setMode('DEPOSIT'); setDepositCode(''); }}
                        className={`p-4 rounded-xl text-left transition-all ${mode === 'DEPOSIT' ? 'bg-[#0f1713] shadow-md ring-1 ring-slate-200' : 'hover:bg-emerald-950/40'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${mode === 'DEPOSIT' ? 'bg-emerald-950/30 text-emerald-400' : 'bg-slate-200 text-slate-400'}`}>
                                <ArrowDownLeft className="w-5 h-5" />
                            </div>
                            <span className={`font-bold ${mode === 'DEPOSIT' ? 'text-slate-100' : 'text-slate-400'}`}>Depósito</span>
                        </div>
                        <p className="text-xs text-slate-400">Gerar QR Code para adicionar saldo.</p>
                    </button>

                    <button 
                        onClick={() => { setMode('WITHDRAW'); setWithdrawStatus(''); }}
                        className={`p-4 rounded-xl text-left transition-all ${mode === 'WITHDRAW' ? 'bg-[#0f1713] shadow-md ring-1 ring-slate-200' : 'hover:bg-emerald-950/40'}`}
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${mode === 'WITHDRAW' ? 'bg-emerald-950/40 text-emerald-500' : 'bg-slate-200 text-slate-400'}`}>
                                <ArrowUpRight className="w-5 h-5" />
                            </div>
                            <span className={`font-bold ${mode === 'WITHDRAW' ? 'text-slate-100' : 'text-slate-400'}`}>Saque</span>
                        </div>
                        <p className="text-xs text-slate-400">Transferir saldo para conta externa.</p>
                    </button>
                </div>

                <div className="flex-1 p-8 flex items-center justify-center">
                    {mode === 'DEPOSIT' ? (
                        <div className="w-full max-w-md space-y-6">
                            <h3 className="text-xl font-bold text-slate-100">Novo Depósito Pix</h3>
                            {!depositCode ? (
                                <form onSubmit={handleDeposit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-200 mb-2">Valor do Depósito (R$)</label>
                                        <input 
                                            type="number" step="0.01" required
                                            value={amount} onChange={e => setAmount(e.target.value)}
                                            className="w-full border border-emerald-500/30 rounded-xl px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-emerald-500 bg-[#090d0a] text-white placeholder-slate-500"
                                            placeholder="0,00"
                                        />
                                    </div>
                                    <button disabled={loading} className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold font-bold rounded-xl transition-colors flex justify-center gap-2">
                                        {loading ? <Loader2 className="animate-spin" /> : 'Gerar QR Code'}
                                    </button>
                                </form>
                            ) : (
                                <div className="text-center space-y-6 animate-in zoom-in duration-300">
                                    <div className="bg-[#0f1713] p-4 rounded-2xl shadow-lg border border-emerald-500/20 inline-block">
                                        <QrCode className="w-48 h-48 text-slate-100" />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-slate-400">Copia e Cola</p>
                                        <div className="flex gap-2">
                                            <input readOnly value={depositCode} className="w-full bg-[#090d0a] text-emerald-300 text-xs p-3 rounded-lg border border-emerald-500/20" />
                                            <button onClick={() => navigator.clipboard.writeText(depositCode)} className="p-3 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-300">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={() => { setDepositCode(''); setAmount(''); }} className="text-sm text-emerald-400 hover:underline">
                                        Gerar novo depósito
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="w-full max-w-md space-y-6">
                            <h3 className="text-xl font-bold text-slate-100">Solicitar Saque</h3>
                            {withdrawStatus ? (
                                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-6 text-center animate-in zoom-in">
                                    <div className="w-12 h-12 bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400">
                                        <Check className="w-6 h-6" />
                                    </div>
                                    <p className="text-emerald-300 font-bold">{withdrawStatus}</p>
                                    <button onClick={() => setWithdrawStatus('')} className="mt-4 text-sm text-emerald-400 hover:underline">Novo Saque</button>
                                </div>
                            ) : (
                                <form onSubmit={handleWithdraw} className="space-y-4">
                                     <div>
                                        <label className="block text-sm font-bold text-slate-200 mb-2">Chave Pix</label>
                                        <input 
                                            type="text" required
                                            value={pixKey} onChange={e => setPixKey(e.target.value)}
                                            className="w-full border border-emerald-500/30 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="CPF, Email ou Aleatória"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-200 mb-2">Valor (R$)</label>
                                        <input 
                                            type="number" step="0.01" required
                                            value={amount} onChange={e => setAmount(e.target.value)}
                                            className="w-full border border-emerald-500/30 rounded-xl px-4 py-3 text-lg outline-none focus:ring-2 focus:ring-emerald-500"
                                            placeholder="0,00"
                                        />
                                    </div>
                                    <button disabled={loading} className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors flex justify-center gap-2">
                                        {loading ? <Loader2 className="animate-spin" /> : 'Confirmar Saque'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

