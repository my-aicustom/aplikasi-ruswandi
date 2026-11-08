import React, { useState } from 'react'
import { FileText, Download, Plus, Trash2, RefreshCw, Copy, Check, Sparkles, Share2, HelpCircle } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import { terbilangRupiah, formatNumberDots, parseNumberDots } from '../utils/terbilang'

const ROMAN_MONTHS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

const buildNoInvoice = (seq, dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date()
  const m = d.getMonth() + 1
  const roman = ROMAN_MONTHS[m] || 'XI'
  const y = d.getFullYear()
  const s = String(seq).padStart(3, '0')
  return `${s} / ${roman} / ${y}`
}

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]} / ${parts[1]} / ${parts[0]}`
  }
  return dateStr
}

const formatRupiahSimple = (val) => {
  const num = typeof val === 'number' ? val : parseInt(val || '0', 10)
  return 'Rp. ' + (num || 0).toLocaleString('id-ID')
}

// Preset Data: Bp Jovan (Sesuai Catatan Tangan di WhatsApp)
const JOVAN_PRESET = {
  nomor: '002 / XI / 2026',
  tanggal: '2026-11-08',
  subjudul: 'TAGIHAN PROG 35% SETELAH MATERIAL TERKIRIM',
  sudahTerimaDari: 'Bp Jovan',
  isManualTerbilang: false,
  manualTerbilangText: '',
  pekerjaanList: [
    'Pasang plafon lambersering ulin',
    'Pasang deck ulin'
  ],
  totalHargaLabel: 'Total pekerjaan',
  totalHarga: 72000000,
  breakdownRows: [
    { id: 1, label: 'Sudah terima dp 50%', amount: 36000000, isCurrentBilled: false, isBold: true },
    { id: 2, label: '* pengajuan Dp II 35%', amount: 25200000, isCurrentBilled: true, isBold: true },
    { id: 3, label: 'Sisa Tagihan Setelah Terpasang', amount: 10800000, isCurrentBilled: false, isBold: false }
  ],
  note: 'Pembayaran mohon ditransfer ke Rek. BCA\nNo. Rek.: 755 0033 997 a/n Ruswandi',
  customBadgeLabel: 'JUMLAH DP II YANG DITAGIHKAN',
  signatureName: 'RUSWANDI'
}

// Preset Data: PT Ritra Cargo (Sesuai Contoh Format)
const RITRA_PRESET = {
  nomor: '001 / XIII / 2026',
  tanggal: '2026-08-24',
  subjudul: 'TAGIHAN DP 50%',
  sudahTerimaDari: 'PT Ritra Cargo',
  isManualTerbilang: false,
  manualTerbilangText: '',
  pekerjaanList: [
    'Pasang lambersering ulir',
    'Pasang kisi-kisi ulir',
    'Pasang deck ulir',
    'Pasang bungkus kolom tiang ulir',
    'Pasang trap tangga jati'
  ],
  totalHargaLabel: 'Total Harga',
  totalHarga: 487000000,
  breakdownRows: [
    { id: 1, label: 'DP 50%', amount: 243500000, isCurrentBilled: true, isBold: true },
    { id: 2, label: 'Progress Setelah pekerjaan mulai', amount: 170450000, isCurrentBilled: false, isBold: false },
    { id: 3, label: 'Tagihan setelah terpasang 15%', amount: 73050000, isCurrentBilled: false, isBold: false }
  ],
  note: 'Pembayaran mohon ditransfer ke Rek. BCA\nNo. Rek.: 755 0033 997 a/n Ruswandi',
  customBadgeLabel: 'JUMLAH DP YANG DITAGIHKAN',
  signatureName: 'RUSWANDI'
}

export default function InvoiceView() {
  const [seqNumber, setSeqNumber] = useState(2)
  const [nomor, setNomor] = useState(JOVAN_PRESET.nomor)
  const [tanggal, setTanggal] = useState(JOVAN_PRESET.tanggal)
  const [subjudul, setSubjudul] = useState(JOVAN_PRESET.subjudul)
  const [sudahTerimaDari, setSudahTerimaDari] = useState(JOVAN_PRESET.sudahTerimaDari)
  const [isManualTerbilang, setIsManualTerbilang] = useState(false)
  const [manualTerbilangText, setManualTerbilangText] = useState('')
  const [pekerjaanList, setPekerjaanList] = useState(JOVAN_PRESET.pekerjaanList)
  const [totalHargaLabel, setTotalHargaLabel] = useState(JOVAN_PRESET.totalHargaLabel)
  const [totalHarga, setTotalHarga] = useState(JOVAN_PRESET.totalHarga)
  const [breakdownRows, setBreakdownRows] = useState(JOVAN_PRESET.breakdownRows)
  const [note, setNote] = useState(JOVAN_PRESET.note)
  const [customBadgeLabel, setCustomBadgeLabel] = useState(JOVAN_PRESET.customBadgeLabel)
  const [signatureName, setSignatureName] = useState(JOVAN_PRESET.signatureName)
  const [copiedWa, setCopiedWa] = useState(false)
  const [downloading, setDownloading] = useState(false)

  // Hitung baris yang sedang aktif ditagihkan
  const currentBilledRow = breakdownRows.find(r => r.isCurrentBilled) || breakdownRows[0]
  const currentBilledAmount = currentBilledRow ? currentBilledRow.amount : 0

  // Terbilang aktif
  const autoTerbilang = terbilangRupiah(currentBilledAmount)
  const displayedTerbilang = isManualTerbilang && manualTerbilangText.trim()
    ? manualTerbilangText
    : autoTerbilang

  // Badge label aktif
  const displayedBadgeLabel = customBadgeLabel.trim()
    ? customBadgeLabel
    : (currentBilledRow?.label ? `JUMLAH ${currentBilledRow.label.replace(/^[*_-\s]+/, '').toUpperCase()} YANG DITAGIHKAN` : 'JUMLAH YANG DITAGIHKAN')

  // Handler load preset
  const loadPreset = (preset) => {
    setNomor(preset.nomor)
    setTanggal(preset.tanggal)
    setSubjudul(preset.subjudul)
    setSudahTerimaDari(preset.sudahTerimaDari)
    setIsManualTerbilang(preset.isManualTerbilang)
    setManualTerbilangText(preset.manualTerbilangText)
    setPekerjaanList([...preset.pekerjaanList])
    setTotalHargaLabel(preset.totalHargaLabel)
    setTotalHarga(preset.totalHarga)
    setBreakdownRows(preset.breakdownRows.map(r => ({ ...r })))
    setNote(preset.note)
    setCustomBadgeLabel(preset.customBadgeLabel)
    setSignatureName(preset.signatureName)
  }

  const resetBlank = () => {
    const today = new Date().toISOString().split('T')[0]
    setNomor(buildNoInvoice(seqNumber + 1, today))
    setTanggal(today)
    setSubjudul('TAGIHAN DP 50%')
    setSudahTerimaDari('')
    setIsManualTerbilang(false)
    setManualTerbilangText('')
    setPekerjaanList([''])
    setTotalHargaLabel('Total pekerjaan')
    setTotalHarga(0)
    setBreakdownRows([
      { id: 1, label: 'DP 50%', amount: 0, isCurrentBilled: true, isBold: true },
      { id: 2, label: 'Pelunasan 50%', amount: 0, isCurrentBilled: false, isBold: false }
    ])
    setNote('Pembayaran mohon ditransfer ke Rek. BCA\nNo. Rek.: 755 0033 997 a/n Ruswandi')
    setCustomBadgeLabel('')
  }

  // Quick kalkulator termin
  const applyTerminSplit = (percentages) => {
    if (!totalHarga || totalHarga <= 0) {
      alert('Isi Total Pekerjaan terlebih dahulu untuk membagi termin otomatis!')
      return
    }
    const newRows = percentages.map((p, idx) => {
      const amt = Math.round((totalHarga * p.pct) / 100)
      return {
        id: Date.now() + idx,
        label: p.label,
        amount: amt,
        isCurrentBilled: idx === (p.isBilled ? idx : 0),
        isBold: p.isBold ?? true
      }
    })
    setBreakdownRows(newRows)
  }

  // Pekerjaan handlers
  const addPekerjaan = () => {
    setPekerjaanList(prev => [...prev, ''])
  }
  const updatePekerjaan = (index, val) => {
    setPekerjaanList(prev => prev.map((item, i) => i === index ? val : item))
  }
  const removePekerjaan = (index) => {
    if (pekerjaanList.length > 1) {
      setPekerjaanList(prev => prev.filter((_, i) => i !== index))
    }
  }

  // Breakdown handlers
  const addBreakdownRow = () => {
    setBreakdownRows(prev => [
      ...prev,
      { id: Date.now(), label: '', amount: 0, isCurrentBilled: false, isBold: false }
    ])
  }
  const updateBreakdownRow = (id, field, val) => {
    setBreakdownRows(prev => prev.map(row => {
      if (row.id === id) {
        return { ...row, [field]: val }
      }
      return row
    }))
  }
  const setBilledRow = (id) => {
    setBreakdownRows(prev => prev.map(row => ({
      ...row,
      isCurrentBilled: row.id === id
    })))
  }
  const removeBreakdownRow = (id) => {
    if (breakdownRows.length > 1) {
      setBreakdownRows(prev => prev.filter(r => r.id !== id))
    }
  }

  // Salin ringkasan WhatsApp
  const copyWhatsApp = () => {
    const listPekerjaanStr = pekerjaanList.filter(Boolean).map(p => `• ${p}`).join('\n')
    const breakdownStr = breakdownRows.map(r => {
      const star = r.isCurrentBilled ? '*' : ''
      return `${star}- ${r.label}: ${formatRupiahSimple(r.amount)}${star}`
    }).join('\n')

    const waText = `*INVOICE / TAGIHAN RESMI - SP SERASI PARQUET*
No: ${nomor}
Tanggal: ${formatDateDisplay(tanggal)}
Perihal: *${subjudul}*
Penerima: *${sudahTerimaDari || '-'}*

*Pekerjaan:*
${listPekerjaanStr || '-'}

*Rincian Keuangan:*
- ${totalHargaLabel}: ${formatRupiahSimple(totalHarga)}
${breakdownStr}

*JUMLAH YANG DITAGIHKAN SAAT INI:*
*${formatRupiahSimple(currentBilledAmount)}*
_(${displayedTerbilang})_

*Note Pembayaran:*
${note}

Hormat kami,
*${signatureName}*`

    navigator.clipboard.writeText(waText)
    setCopiedWa(true)
    setTimeout(() => setCopiedWa(false), 2500)
  }

  // Download PDF
  const generatePDF = () => {
    if (!sudahTerimaDari.trim()) {
      alert('Harap isi kolom "Sudah terima dari" terlebih dahulu.')
      return
    }

    setDownloading(true)
    const element = document.getElementById('invoice-preview-content')
    const safeName = (sudahTerimaDari || 'Client').replace(/[^a-zA-Z0-9]/g, '_')
    const safeNomor = (nomor || 'Draft').replace(/[^a-zA-Z0-9]/g, '_')

    const opt = {
      margin: [10, 12, 10, 12],
      filename: `Invoice_${safeName}_${safeNomor}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .finally(() => {
        setDownloading(false)
      })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* Kolom Kiri: Form Input Invoice */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-6">
        {/* Preset Selector */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-red-600" />
            <span className="font-bold text-sm text-gray-800">Muat Contoh / Template Cepat:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => loadPreset(JOVAN_PRESET)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              ⭐ Tagihan Bp Jovan (Prog 35% - Catatan)
            </button>
            <button
              type="button"
              onClick={() => loadPreset(RITRA_PRESET)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-900 text-white rounded-md text-xs font-semibold shadow-sm transition-all"
            >
              📄 Contoh PT Ritra Cargo (DP 50%)
            </button>
            <button
              type="button"
              onClick={resetBlank}
              className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md text-xs font-medium transition-all"
            >
              🔄 Buat Invoice Baru
            </button>
          </div>
        </div>

        {/* Informasi Utama */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-gray-800 pb-2 border-b flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-600" />
            Informasi Surat & Header
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nomor Invoice
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={nomor}
                  onChange={(e) => setNomor(e.target.value)}
                  placeholder="001 / XIII / 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = seqNumber + 1
                    setSeqNumber(next)
                    setNomor(buildNoInvoice(next, tanggal))
                  }}
                  title="Generate Nomor Berikutnya"
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md text-gray-700 text-xs flex items-center"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tanggal Invoice
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Sub-Judul / Jenis Tagihan (Teks Merah di Bawah INVOICE)
            </label>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={subjudul}
                onChange={(e) => setSubjudul(e.target.value)}
                placeholder="Contoh: TAGIHAN DP 50% atau TAGIHAN PROG 35% SETELAH MATERIAL TERKIRIM"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-semibold text-red-700 focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
              <div className="flex flex-wrap gap-1.5 text-xs text-gray-600">
                <span className="text-gray-400 self-center">Pilihan cepat:</span>
                <button
                  type="button"
                  onClick={() => setSubjudul('TAGIHAN PROG 35% SETELAH MATERIAL TERKIRIM')}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-red-50 hover:text-red-700 rounded border border-gray-200"
                >
                  Prog 35% Material Terkirim
                </button>
                <button
                  type="button"
                  onClick={() => setSubjudul('TAGIHAN DP 50%')}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-red-50 hover:text-red-700 rounded border border-gray-200"
                >
                  DP 50%
                </button>
                <button
                  type="button"
                  onClick={() => setSubjudul('PELUNASAN SETELAH TERPASANG 15%')}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-red-50 hover:text-red-700 rounded border border-gray-200"
                >
                  Pelunasan 15%
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Pihak Pembayar / Penerima */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-gray-800 pb-2 border-b">
            Pihak Pembayar (Sudah Terima Dari)
          </h3>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Sudah terima dari
            </label>
            <input
              type="text"
              value={sudahTerimaDari}
              onChange={(e) => setSudahTerimaDari(e.target.value)}
              placeholder="Contoh: Bp Jovan atau PT Ritra Cargo"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-700">
                Banyaknya Uang (Terbilang)
              </label>
              <label className="flex items-center text-xs text-blue-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isManualTerbilang}
                  onChange={(e) => {
                    setIsManualTerbilang(e.target.checked)
                    if (e.target.checked && !manualTerbilangText) {
                      setManualTerbilangText(autoTerbilang)
                    }
                  }}
                  className="mr-1 rounded"
                />
                Ubah Kalimat Manual
              </label>
            </div>
            {isManualTerbilang ? (
              <textarea
                value={manualTerbilangText}
                onChange={(e) => setManualTerbilangText(e.target.value)}
                rows="2"
                placeholder="Ketik kalimat terbilang manual..."
                className="w-full px-3 py-2 border border-blue-400 bg-blue-50/30 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            ) : (
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-800 italic">
                "{displayedTerbilang || 'Nol rupiah'}"
              </div>
            )}
            <p className="text-[11px] text-gray-500 mt-1">
              *Otomatis menghitung kalimat dari nominal termin yang sedang ditagihkan saat ini.
            </p>
          </div>
        </div>

        {/* Daftar Pekerjaan */}
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-2 border-b">
            <h3 className="font-bold text-base text-gray-800">
              Rincian Pekerjaan (Untuk Pekerjaan)
            </h3>
            <button
              type="button"
              onClick={addPekerjaan}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Pekerjaan
            </button>
          </div>

          <div className="space-y-2">
            {pekerjaanList.map((job, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-5 text-right font-mono">{idx + 1}.</span>
                <input
                  type="text"
                  value={job}
                  onChange={(e) => updatePekerjaan(idx, e.target.value)}
                  placeholder="Contoh: Pasang plafon lambersering ulin"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
                {pekerjaanList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePekerjaan(idx)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Struktur Keuangan & Termin */}
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b">
            <h3 className="font-bold text-base text-gray-800">
              Rincian Keuangan & Termin
            </h3>
            <button
              type="button"
              onClick={addBreakdownRow}
              className="px-2.5 py-1 bg-gray-800 hover:bg-gray-900 text-white rounded text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Baris
            </button>
          </div>

          {/* Total Pekerjaan */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Label Total
              </label>
              <input
                type="text"
                value={totalHargaLabel}
                onChange={(e) => setTotalHargaLabel(e.target.value)}
                placeholder="Total pekerjaan / Total Harga"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-semibold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Total Nominal (Rp)
              </label>
              <input
                type="text"
                value={totalHarga ? formatNumberDots(totalHarga) : ''}
                onChange={(e) => setTotalHarga(parseNumberDots(e.target.value))}
                placeholder="72.000.000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-bold text-gray-900 focus:outline-none"
              />
            </div>
          </div>

          {/* Quick Buttons Split */}
          <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
            <span className="font-semibold text-gray-700">Skema Otomatis:</span>
            <button
              type="button"
              onClick={() => applyTerminSplit([
                { label: 'Sudah terima dp 50%', pct: 50, isBilled: false, isBold: true },
                { label: '* pengajuan Dp II 35%', pct: 35, isBilled: true, isBold: true },
                { label: 'Sisa Tagihan Setelah Terpasang', pct: 15, isBilled: false, isBold: false }
              ])}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded"
            >
              50% - 35% - 15% (Pak Jovan)
            </button>
            <button
              type="button"
              onClick={() => applyTerminSplit([
                { label: 'DP 50%', pct: 50, isBilled: true, isBold: true },
                { label: 'Pelunasan Setelah Terpasang 50%', pct: 50, isBilled: false, isBold: false }
              ])}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded"
            >
              50% - 50%
            </button>
          </div>

          {/* Daftar Baris Rincian */}
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 px-1">
              <span className="col-span-1 text-center">Ditagih</span>
              <span className="col-span-6">Keterangan / Termin</span>
              <span className="col-span-4 text-right">Nominal (Rp)</span>
              <span className="col-span-1 text-center">Aksi</span>
            </div>

            {breakdownRows.map((row) => (
              <div
                key={row.id}
                className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-lg border transition-all ${
                  row.isCurrentBilled
                    ? 'bg-red-50/70 border-red-300 shadow-sm'
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Radio Tagihan Aktif */}
                <div className="col-span-1 flex justify-center">
                  <input
                    type="radio"
                    name="currentBilledSelect"
                    checked={row.isCurrentBilled}
                    onChange={() => setBilledRow(row.id)}
                    title="Pilih sebagai termin yang ditagihkan saat ini"
                    className="w-4 h-4 text-red-600 focus:ring-red-500 cursor-pointer"
                  />
                </div>

                {/* Label */}
                <div className="col-span-6">
                  <input
                    type="text"
                    value={row.label}
                    onChange={(e) => updateBreakdownRow(row.id, 'label', e.target.value)}
                    placeholder="Contoh: DP 50% atau Pelunasan"
                    className={`w-full px-2.5 py-1.5 border rounded text-xs ${
                      row.isCurrentBilled ? 'border-red-400 font-bold text-red-900' : 'border-gray-300'
                    }`}
                  />
                </div>

                {/* Amount */}
                <div className="col-span-4">
                  <input
                    type="text"
                    value={row.amount ? formatNumberDots(row.amount) : ''}
                    onChange={(e) => updateBreakdownRow(row.id, 'amount', parseNumberDots(e.target.value))}
                    placeholder="0"
                    className={`w-full px-2.5 py-1.5 border rounded text-xs text-right ${
                      row.isCurrentBilled ? 'border-red-400 font-bold text-red-900' : 'border-gray-300'
                    }`}
                  />
                </div>

                {/* Delete button */}
                <div className="col-span-1 flex justify-center">
                  {breakdownRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBreakdownRow(row.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500 italic">
            *Pilih radio button di sebelah kiri untuk menentukan baris mana yang aktif ditagihkan di invoice ini (akan mengisi kotak jumlah tagihan dan terbilang).
          </p>
        </div>

        {/* Note Rekening & Footer Info */}
        <div className="space-y-4">
          <h3 className="font-bold text-base text-gray-800 pb-2 border-b">
            Rekening & Keterangan Bawah
          </h3>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Catatan Transfer (Note)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Custom Label Kotak Tagihan Bawah (Opsional)
              </label>
              <input
                type="text"
                value={customBadgeLabel}
                onChange={(e) => setCustomBadgeLabel(e.target.value)}
                placeholder={displayedBadgeLabel}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Nama Penandatangan
              </label>
              <input
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-bold uppercase focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={generatePDF}
            disabled={downloading}
            className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <Download className="w-5 h-5" />
            {downloading ? 'Sedang Menyusun PDF...' : 'Download PDF Invoice Resmi'}
          </button>
          <button
            type="button"
            onClick={copyWhatsApp}
            className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow transition-all flex items-center justify-center gap-2 text-sm"
          >
            {copiedWa ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copiedWa ? 'Tersalin ke Clipboard!' : 'Salin Teks WhatsApp'}
          </button>
        </div>
      </div>

      {/* Kolom Kanan: Live Preview A4 Sesuai Serasi Parquet */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <span>Live Preview Invoice (Format Resmi Serasi Parquet)</span>
          </h2>
          <span className="text-xs px-2.5 py-1 bg-red-100 text-red-800 font-bold rounded-full">
            Ukuran Cetak A4
          </span>
        </div>

        {/* Container Dokumen A4 */}
        <div className="bg-white rounded-xl shadow-2xl border border-gray-300 p-8 overflow-x-auto">
          <div
            id="invoice-preview-content"
            style={{
              width: '100%',
              maxWidth: '720px',
              margin: '0 auto',
              backgroundColor: '#ffffff',
              color: '#111827',
              fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
              fontSize: '13px',
              lineHeight: '1.4'
            }}
          >
            {/* Header Red Banner */}
            <div
              style={{
                backgroundColor: '#d01515',
                color: '#ffffff',
                padding: '16px 22px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: '25px',
                    fontWeight: '800',
                    letterSpacing: '0.5px',
                    margin: 0,
                    fontFamily: 'Arial, Helvetica, sans-serif'
                  }}
                >
                  SP SERASI PARQUET
                </h1>
              </div>
              <div
                style={{
                  textAlign: 'right',
                  fontSize: '11px',
                  lineHeight: '1.35'
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: '700' }}>Menjual &amp; Memasang</div>
                <div style={{ fontSize: '13px', fontStyle: 'italic', marginBottom: '3px' }}>
                  Lantai Kayu dan Decking
                </div>
                <div style={{ fontSize: '10.5px', opacity: 0.95 }}>Jati &bull; Merbau &bull; Kusen</div>
                <div style={{ fontSize: '10.5px', opacity: 0.95 }}>Ulin &bull; Bengkirai &bull; Pintu Solid</div>
              </div>
            </div>

            {/* Address line with red underline */}
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: '700',
                color: '#d01515',
                padding: '5px 0 4px 0',
                borderBottom: '2.5px solid #d01515',
                marginBottom: '22px'
              }}
            >
              Jl. Salak 5 No. 6 Pamulang, Tangerang Selatan
            </div>

            {/* Title & Metadata Section */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '22px'
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '26px',
                    fontWeight: '900',
                    letterSpacing: '1.5px',
                    margin: '0 0 3px 0',
                    color: '#000000'
                  }}
                >
                  INVOICE
                </h2>
                <div
                  style={{
                    color: '#d01515',
                    fontWeight: '800',
                    fontSize: '13.5px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {subjudul || 'TAGIHAN'}
                </div>
              </div>

              <div>
                <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 600, padding: '2px 4px' }}>Nomor</td>
                      <td style={{ fontWeight: 600, padding: '2px 6px', textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 600, padding: '2px 4px' }}>{nomor || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 600, padding: '2px 4px' }}>Tanggal</td>
                      <td style={{ fontWeight: 600, padding: '2px 6px', textAlign: 'center' }}>:</td>
                      <td style={{ fontWeight: 600, padding: '2px 4px' }}>{formatDateDisplay(tanggal) || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Box Tabel Utama */}
            <div
              style={{
                border: '1.5px solid #222222',
                marginBottom: '24px'
              }}
            >
              {/* Sudah terima dari */}
              <div
                style={{
                  display: 'flex',
                  padding: '10px 14px',
                  borderBottom: '1px solid #222222',
                  fontSize: '13.5px'
                }}
              >
                <div style={{ width: '160px', fontWeight: '700', flexShrink: 0 }}>Sudah terima dari</div>
                <div style={{ width: '25px', fontWeight: '700', textAlign: 'center', flexShrink: 0 }}>=</div>
                <div style={{ flex: 1, fontWeight: '700' }}>{sudahTerimaDari || '-'}</div>
              </div>

              {/* Banyaknya uang */}
              <div
                style={{
                  display: 'flex',
                  padding: '10px 14px',
                  borderBottom: '1px solid #222222',
                  fontSize: '13.5px'
                }}
              >
                <div style={{ width: '160px', fontWeight: '700', flexShrink: 0 }}>Banyaknya uang</div>
                <div style={{ width: '25px', fontWeight: '700', textAlign: 'center', flexShrink: 0 }}>=</div>
                <div style={{ flex: 1, fontWeight: '500' }}>
                  {displayedTerbilang || 'Nol rupiah'}
                </div>
              </div>

              {/* Untuk pekerjaan */}
              <div
                style={{
                  display: 'flex',
                  padding: '11px 14px',
                  borderBottom: '1.5px solid #222222',
                  fontSize: '13.5px'
                }}
              >
                <div style={{ width: '160px', fontWeight: '700', flexShrink: 0 }}>Untuk pekerjaan</div>
                <div style={{ width: '25px', fontWeight: '700', textAlign: 'center', flexShrink: 0 }}>=</div>
                <div style={{ flex: 1, paddingLeft: '8px' }}>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {pekerjaanList.filter(Boolean).map((job, idx) => (
                      <li
                        key={idx}
                        style={{
                          position: 'relative',
                          paddingLeft: '14px',
                          marginBottom: idx === pekerjaanList.length - 1 ? 0 : '4px',
                          fontWeight: '500'
                        }}
                      >
                        <span style={{ position: 'absolute', left: 0, fontWeight: '700' }}>-</span>
                        {job}
                      </li>
                    ))}
                    {pekerjaanList.filter(Boolean).length === 0 && (
                      <li style={{ fontStyle: 'italic', color: '#6b7280' }}>- Belum ada rincian pekerjaan</li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Rincian Keuangan */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #222222'
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <tbody>
                    {/* Baris Total */}
                    <tr style={{ fontWeight: '700' }}>
                      <td style={{ padding: '4px 0', textAlign: 'left' }}>{totalHargaLabel || 'Total Harga'}</td>
                      <td style={{ width: '40px', textAlign: 'center', fontWeight: '700' }}>=</td>
                      <td style={{ width: '180px', textAlign: 'right', fontWeight: '700', paddingRight: '4px' }}>
                        {formatRupiahSimple(totalHarga)}
                      </td>
                    </tr>

                    {/* Baris Termin */}
                    {breakdownRows.map((row) => (
                      <tr
                        key={row.id}
                        style={{
                          fontWeight: row.isCurrentBilled || row.isBold ? '700' : '500'
                        }}
                      >
                        <td style={{ padding: '4px 0', textAlign: 'left' }}>
                          {row.label || '-'}
                        </td>
                        <td style={{ width: '40px', textAlign: 'center', fontWeight: '700' }}>=</td>
                        <td
                          style={{
                            width: '180px',
                            textAlign: 'right',
                            fontWeight: row.isCurrentBilled || row.isBold ? '700' : '500',
                            paddingRight: '4px'
                          }}
                        >
                          {formatRupiahSimple(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Note Pembayaran */}
              <div
                style={{
                  display: 'flex',
                  padding: '11px 14px',
                  fontSize: '12.5px'
                }}
              >
                <div style={{ width: '55px', fontWeight: '700', flexShrink: 0 }}>Note:</div>
                <div style={{ flex: 1, whiteSpace: 'pre-line', lineHeight: '1.45', fontWeight: '500' }}>
                  {note || '-'}
                </div>
              </div>
            </div>

            {/* Footer Bagian Bawah: Badge & Tanda Tangan */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                padding: '0 4px'
              }}
            >
              {/* Badge Kotak Abu-Abu Tagihan */}
              <div
                style={{
                  backgroundColor: '#f1f4f8',
                  borderRadius: '8px',
                  padding: '12px 20px',
                  display: 'inline-block',
                  minWidth: '260px'
                }}
              >
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: '800',
                    color: '#4b5563',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '4px'
                  }}
                >
                  {displayedBadgeLabel}
                </div>
                <div
                  style={{
                    fontSize: '23px',
                    fontWeight: '900',
                    color: '#000000',
                    letterSpacing: '0.5px'
                  }}
                >
                  {formatRupiahSimple(currentBilledAmount)}
                </div>
              </div>

              {/* Tanda Tangan Ruswandi */}
              <div style={{ textAlign: 'center', width: '180px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: '500', marginBottom: '4px' }}>
                  Hormat kami,
                </div>
                <img
                  src="ruswandi_signature.png"
                  alt="Tanda Tangan Ruswandi"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = 'tanda tangan.png'
                  }}
                  style={{
                    height: '52px',
                    display: 'block',
                    margin: '0 auto',
                    objectFit: 'contain'
                  }}
                />
                <div
                  style={{
                    width: '140px',
                    height: '1.2px',
                    backgroundColor: '#222222',
                    margin: '4px auto 5px auto'
                  }}
                />
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                >
                  {signatureName || 'RUSWANDI'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
