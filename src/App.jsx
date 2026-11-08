import React, { useState } from 'react'
import { FileText, Download, Plus, Trash2, RefreshCw, Copy, Receipt } from 'lucide-react'
import html2pdf from 'html2pdf.js'
import InvoiceView from './components/InvoiceView'

const PPN_RATE = 11

const INSTALLATION_NOTE_OPTIONS = [
  {
    value: 'harga_belum_termasuk_pemasangan',
    label: 'Harga belum termasuk pemasangan',
    noteLabel: 'Harga belum termasuk pemasangan'
  },
  {
    value: 'harga_sudah_termasuk_pemasangan',
    label: 'Harga sudah termasuk pemasangan',
    noteLabel: 'Harga sudah termasuk pemasangan'
  },
  {
    value: '',
    label: 'Kosongkan status pemasangan',
    noteLabel: ''
  }
]

const PAYMENT_NOTE_OPTIONS = [
  {
    value: 'pelunasan_setelah_barang_dikirim',
    label: 'Pelunasan dilakukan setelah barang dikirim',
    noteLabel: 'Pelunasan dilakukan setelah barang dikirim'
  },
  {
    value: 'pelunasan_setelah_barang_dicek',
    label: 'Pelunasan dilakukan setelah barang dicek',
    noteLabel: 'Pelunasan dilakukan setelah barang dicek'
  },
  {
    value: 'pelunasan_sebelum_barang_dikirim',
    label: 'Pelunasan dilakukan sebelum barang dikirim',
    noteLabel: 'Pelunasan dilakukan sebelum barang dikirim'
  },
  {
    value: '',
    label: 'Kosongkan metode pelunasan',
    noteLabel: ''
  }
]

const buildNoteFromSelections = (installationValue, paymentValue) => {
  const installationLabel = INSTALLATION_NOTE_OPTIONS.find((option) => option.value === installationValue)?.noteLabel || ''
  const paymentLabel = PAYMENT_NOTE_OPTIONS.find((option) => option.value === paymentValue)?.noteLabel || ''
  const noteParts = [installationLabel, paymentLabel].filter(Boolean)
  return noteParts.length > 0 ? `${noteParts.join('. ')}.` : ''
}

const buildRemainingBillLabel = (paymentValue) => {
  if (!paymentValue) {
    return 'SISA TAGIHAN'
  }
  if (paymentValue === 'pelunasan_setelah_barang_dicek') {
    return 'SISA TAGIHAN SETELAH BARANG DICEK'
  }
  if (paymentValue === 'pelunasan_sebelum_barang_dikirim') {
    return 'PELUNASAN SEBELUM BARANG DIKIRIM'
  }
  return 'SISA TAGIHAN SETELAH BARANG DIKIRIM'
}

const normalizeRemainingBillLabel = (label) => {
  return label.trim().replace(/\s*:\s*$/, '')
}

const buildNoPenawaran = (sequence, dateString) => {
  const sourceDate = dateString ? new Date(dateString) : new Date()
  const month = String(sourceDate.getMonth() + 1).padStart(2, '0')
  const year = sourceDate.getFullYear()
  const nomorUrut = String(sequence).padStart(3, '0')
  return `${nomorUrut}/PEN/${month}/${year}`
}

function App() {
  const [activeTab, setActiveTab] = useState('invoice')
  const [nomorUrut, setNomorUrut] = useState(1)

  const [formData, setFormData] = useState({
    noPenawaran: buildNoPenawaran(1),
    tanggal: new Date().toISOString().split('T')[0],
    kepada: '',
    perusahaan: '',
    alamat: '',
    perihal: 'Penawaran Harga'
  })

  const [items, setItems] = useState([
    { id: 1, deskripsi: '', qty: 1, satuan: 'm1', hargaSatuan: 0, gunakanQty: true, gunakanSatuan: true, diskonItem: 0 }
  ])

  const [dpPercentage, setDpPercentage] = useState(0)
  const [diskonTotalNominal, setDiskonTotalNominal] = useState(0)
  const [taxMode, setTaxMode] = useState('none')
  const defaultInstallationValue = INSTALLATION_NOTE_OPTIONS[0].value
  const defaultPaymentValue = PAYMENT_NOTE_OPTIONS[0].value
  const [selectedInstallationNote, setSelectedInstallationNote] = useState(defaultInstallationValue)
  const [selectedPaymentNote, setSelectedPaymentNote] = useState(defaultPaymentValue)
  const [noteText, setNoteText] = useState(buildNoteFromSelections(defaultInstallationValue, defaultPaymentValue))
  const [customRemainingBillLabel, setCustomRemainingBillLabel] = useState('')
  const [customRemainingBillAmount, setCustomRemainingBillAmount] = useState(null)
  const [customSubtotalNominal, setCustomSubtotalNominal] = useState(null)
  const [customTotalAkhirNominal, setCustomTotalAkhirNominal] = useState(null)
  const [customDpNominal, setCustomDpNominal] = useState(null)
  const [customSummaryRows, setCustomSummaryRows] = useState([])
  const remainingBillLabel = normalizeRemainingBillLabel(customRemainingBillLabel) || buildRemainingBillLabel(selectedPaymentNote)

  const handleInstallationNoteChange = (noteValue) => {
    setSelectedInstallationNote(noteValue)
    setNoteText(buildNoteFromSelections(noteValue, selectedPaymentNote))
  }

  const handlePaymentNoteChange = (noteValue) => {
    setSelectedPaymentNote(noteValue)
    setNoteText(buildNoteFromSelections(selectedInstallationNote, noteValue))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleItemChange = (id, field, value) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const addItem = () => {
    setItems(prev => [...prev, {
      id: Date.now(),
      deskripsi: '',
      qty: 1,
      satuan: 'm1',
      hargaSatuan: 0,
      gunakanQty: true,
      gunakanSatuan: true,
      diskonItem: 0
    }])
  }

  const duplicateItem = (id) => {
    setItems(prev => {
      const source = prev.find(item => item.id === id)
      if (!source) return prev
      return [...prev, { ...source, id: Date.now() + Math.floor(Math.random() * 1000) }]
    })
  }

  const handleQtyToggle = (id, isEnabled) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      if (!isEnabled) {
        return { ...item, gunakanQty: false, qty: '' }
      }
      return { ...item, gunakanQty: true, qty: item.qty === '' ? 1 : item.qty }
    }))
  }

  const handleSatuanToggle = (id, isEnabled) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item
      if (!isEnabled) {
        return { ...item, gunakanSatuan: false, satuan: '' }
      }
      return { ...item, gunakanSatuan: true, satuan: item.satuan || 'm1' }
    }))
  }

  const formatRupiahInput = (value) => {
    // Hapus semua karakter non-digit
    const numbers = value.replace(/\D/g, '')
    // Format dengan titik sebagai pemisah ribuan
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  const parseRupiahInput = (value) => {
    // Hapus titik dan convert ke number
    return parseInt(value.replace(/\./g, '') || '0')
  }

  const parseOptionalRupiahInput = (value) => {
    const numbers = value.replace(/\D/g, '')
    if (!numbers) return null
    return parseInt(numbers, 10)
  }

  const removeItem = (id) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id))
    }
  }

  const addCustomSummaryRow = () => {
    setCustomSummaryRows(prev => [...prev, { id: Date.now() + Math.floor(Math.random() * 1000), label: '', amount: 0 }])
  }

  const updateCustomSummaryRow = (id, field, value) => {
    setCustomSummaryRows(prev => prev.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ))
  }

  const removeCustomSummaryRow = (id) => {
    setCustomSummaryRows(prev => prev.filter(row => row.id !== id))
  }

  const calculateBaseItemTotal = (item) => {
    if (!item.gunakanQty || item.qty === '') {
      return item.hargaSatuan
    }
    return Number(item.qty) * item.hargaSatuan
  }

  const calculateSubtotal = (item) => {
    const discount = Math.min(item.diskonItem || 0, calculateBaseItemTotal(item))
    return calculateBaseItemTotal(item) - discount
  }

  const calculateTotal = () => {
    return items.reduce((total, item) => total + calculateSubtotal(item), 0)
  }

  const calculateDiskonTotalAmount = () => {
    return Math.min(diskonTotalNominal, calculateTotal())
  }

  const calculateSubtotalAfterTotalDiscount = () => {
    return calculateTotal() - calculateDiskonTotalAmount()
  }

  const calculatePpnAmount = () => {
    const subtotalAfterDiscount = calculateSubtotalAfterTotalDiscount()
    if (taxMode === 'exclude') {
      return (subtotalAfterDiscount * PPN_RATE) / 100
    }
    if (taxMode === 'include') {
      return (subtotalAfterDiscount * PPN_RATE) / (100 + PPN_RATE)
    }
    return 0
  }

  const calculateFinalTotal = () => {
    const subtotalAfterDiscount = calculateSubtotalAfterTotalDiscount()
    if (taxMode === 'exclude') {
      return subtotalAfterDiscount + calculatePpnAmount()
    }
    return subtotalAfterDiscount
  }

  const calculateDpAmount = () => {
    return (calculateFinalTotal() * dpPercentage) / 100
  }

  const calculateGrandTotal = () => {
    return calculateFinalTotal() - calculateDpAmount()
  }

  const displayedSubtotal = customSubtotalNominal ?? calculateTotal()
  const displayedTotalAkhir = customTotalAkhirNominal ?? calculateFinalTotal()
  const displayedDpAmount = customDpNominal ?? (dpPercentage > 0 ? calculateDpAmount() : 0)
  const displayedRemainingAmount = customRemainingBillAmount ?? Math.max(displayedTotalAkhir - displayedDpAmount, 0)
  const shouldShowDpRow = dpPercentage > 0 || customDpNominal !== null
  const shouldShowRemainingRow = shouldShowDpRow || customRemainingBillAmount !== null || customRemainingBillLabel.trim()

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka)
  }

  const validateBeforeDownload = () => {
    const errors = []

    if (!formData.kepada.trim()) {
      errors.push('Nama penerima (Kepada Yth.) wajib diisi.')
    }

    items.forEach((item, index) => {
      if (!item.deskripsi.trim()) {
        errors.push(`Deskripsi item ${index + 1} belum diisi.`)
      }
      if (item.hargaSatuan <= 0) {
        errors.push(`Harga satuan item ${index + 1} harus lebih dari 0.`)
      }
      if (item.gunakanQty) {
        const qtyValue = Number(item.qty)
        if (item.qty === '' || Number.isNaN(qtyValue) || qtyValue <= 0) {
          errors.push(`Qty item ${index + 1} harus lebih dari 0 atau matikan "Pakai Qty".`)
        }
      }
      if (item.gunakanSatuan && !item.satuan) {
        errors.push(`Satuan item ${index + 1} belum dipilih.`)
      }
    })

    if (dpPercentage < 0 || dpPercentage > 100) {
      errors.push('DP harus di antara 0% sampai 100%.')
    }

    if (displayedTotalAkhir <= 0) {
      errors.push('Total akhir harus lebih dari Rp0.')
    }

    return errors
  }

  const generatePDF = () => {
    const errors = validateBeforeDownload()
    if (errors.length > 0) {
      alert(`Mohon lengkapi data berikut sebelum download PDF:\n\n- ${errors.join('\n- ')}`)
      return
    }

    const element = document.getElementById('preview-content')
    const opt = {
      margin: 10,
      filename: `Penawaran_${formData.noPenawaran || 'draft'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    html2pdf().set(opt).from(element).save()
  }

  const showQtyColumn = items.some((item) => item.gunakanQty && item.qty !== '')
  const showSatuanColumn = items.some((item) => item.gunakanSatuan && item.satuan)
  const summaryColSpan = 3 + (showQtyColumn ? 1 : 0) + (showSatuanColumn ? 1 : 0)
  const visibleCustomSummaryRows = customSummaryRows.filter((row) => row.label.trim() || row.amount > 0)

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Studio Brand & Navigation Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            SP Serasi Parquet Studio
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
            Generator Dokumen &amp; Tagihan Resmi
          </h1>
          <p className="text-gray-600 text-sm">
            Sistem Pembuat Surat Penawaran Harga &amp; Invoice Resmi by Ruswandi
          </p>

          {/* Tab Switcher */}
          <div className="inline-flex p-1.5 bg-gray-200/90 rounded-xl mt-6 shadow-inner border border-gray-300">
            <button
              type="button"
              onClick={() => setActiveTab('invoice')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'invoice'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Invoice / Tagihan Resmi
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeTab === 'invoice' ? 'bg-red-700 text-white' : 'bg-red-200 text-red-900'
              }`}>
                BARU
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('penawaran')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'penawaran'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              Surat Penawaran Harga
            </button>
          </div>
        </div>

        {activeTab === 'invoice' ? (
          <InvoiceView />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Input */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              Form Input
            </h2>

            {/* Informasi Surat */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3 text-gray-700">Informasi Surat</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. Penawaran
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="noPenawaran"
                      value={formData.noPenawaran}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="001/PEN/XII/2024"
                    />
                    <button
                      onClick={() => {
                        setNomorUrut((prev) => {
                          const next = prev + 1
                          setFormData((prevForm) => ({
                            ...prevForm,
                            noPenawaran: buildNoPenawaran(next, prevForm.tanggal)
                          }))
                          return next
                        })
                      }}
                      className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                      title="Naikkan nomor penawaran"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Urutan saat ini: {String(nomorUrut).padStart(3, '0')} (klik tombol putar untuk nomor berikutnya).
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    name="tanggal"
                    value={formData.tanggal}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Perihal
                  </label>
                  <input
                    type="text"
                    name="perihal"
                    value={formData.perihal}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Penawaran Harga"
                  />
                </div>
              </div>
            </div>

            {/* Informasi Penerima */}
            <div className="mb-6">
              <h3 className="font-semibold text-lg mb-3 text-gray-700">Informasi Penerima</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kepada Yth.
                  </label>
                  <input
                    type="text"
                    name="kepada"
                    value={formData.kepada}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama Penerima"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Perusahaan
                  </label>
                  <input
                    type="text"
                    name="perusahaan"
                    value={formData.perusahaan}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nama Perusahaan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alamat
                  </label>
                  <textarea
                    name="alamat"
                    value={formData.alamat}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Alamat Lengkap"
                  />
                </div>
              </div>
            </div>

            {/* Item Penawaran */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg text-gray-700">Item Penawaran</h3>
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Item
                </button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="border border-gray-300 rounded-md p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm text-gray-700">Item {index + 1}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => duplicateItem(item.id)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          <Copy className="w-3 h-3" />
                          Duplikat
                        </button>
                        {items.length > 1 && (
                          <button
                            onClick={() => removeItem(item.id)}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            <Trash2 className="w-3 h-3" />
                            Hapus
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <textarea
                        placeholder="Deskripsi item (contoh: Jati ukuran 1,5cm x 9cm x 200cm)"
                        value={item.deskripsi}
                        onChange={(e) => handleItemChange(item.id, 'deskripsi', e.target.value)}
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs text-gray-600">Qty / Jumlah</label>
                            <label className="flex items-center text-xs text-gray-600">
                              <input
                                type="checkbox"
                                checked={item.gunakanQty}
                                onChange={(e) => handleQtyToggle(item.id, e.target.checked)}
                                className="mr-1"
                              />
                              Pakai Qty
                            </label>
                          </div>
                          <input
                            type="number"
                            placeholder={item.gunakanQty ? '121' : 'Tidak pakai qty'}
                            value={!item.gunakanQty || item.qty === '' ? '' : item.qty}
                            onChange={(e) => handleItemChange(item.id, 'qty', e.target.value === '' ? '' : Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step="0.01"
                            disabled={!item.gunakanQty}
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs text-gray-600">Satuan</label>
                            <label className="flex items-center text-xs text-gray-600">
                              <input
                                type="checkbox"
                                checked={item.gunakanSatuan}
                                onChange={(e) => handleSatuanToggle(item.id, e.target.checked)}
                                className="mr-1"
                              />
                              Pakai Satuan
                            </label>
                          </div>
                          <select
                            value={item.satuan}
                            onChange={(e) => handleItemChange(item.id, 'satuan', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!item.gunakanSatuan}
                          >
                            <option value="">-</option>
                            <option value="m1">m1 (meter)</option>
                            <option value="m2">m2 (meter²)</option>
                            <option value="m3">m3 (meter³)</option>
                            <option value="pcs">pcs (pieces)</option>
                            <option value="set">set</option>
                            <option value="batang">batang</option>
                            <option value="lembar">lembar</option>
                            <option value="trap">trap</option>
                            <option value="unit">unit</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Harga Satuan</label>
                          <input
                            type="text"
                            placeholder="220.000"
                            value={item.hargaSatuan === 0 ? '' : formatRupiahInput(item.hargaSatuan.toString())}
                            onChange={(e) => handleItemChange(item.id, 'hargaSatuan', parseRupiahInput(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Diskon Item (Rp)</label>
                          <input
                            type="text"
                            placeholder="0"
                            value={item.diskonItem === 0 ? '' : formatRupiahInput(item.diskonItem.toString())}
                            onChange={(e) => handleItemChange(item.id, 'diskonItem', parseRupiahInput(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div className="bg-gray-50 px-3 py-2 rounded border border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Subtotal Item:</span>
                          <span className="font-semibold text-purple-600">{formatRupiah(calculateSubtotal(item))}</span>
                        </div>
                        {item.diskonItem > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Diskon item: {formatRupiah(Math.min(item.diskonItem, calculateBaseItemTotal(item)))}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pilihan Note */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilihan Note
              </label>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Status Pemasangan</p>
                  <div className="space-y-2">
                    {INSTALLATION_NOTE_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="radio"
                          name="installationNoteOption"
                          checked={selectedInstallationNote === option.value}
                          onChange={() => handleInstallationNoteChange(option.value)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Metode Pelunasan</p>
                  <div className="space-y-2">
                    {PAYMENT_NOTE_OPTIONS.map((option) => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="radio"
                          name="paymentNoteOption"
                          checked={selectedPaymentNote === option.value}
                          onChange={() => handlePaymentNoteChange(option.value)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note Manual (Bisa Diubah)
                </label>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={"Ketik note manual di sini...\nContoh:\nPelunasan tahap 1 setelah pemasangan.\nPelunasan tahap 2 setelah serah terima."}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diskon Total (Rp) (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: 150.000"
                value={diskonTotalNominal === 0 ? '' : formatRupiahInput(diskonTotalNominal.toString())}
                onChange={(e) => setDiskonTotalNominal(parseRupiahInput(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {diskonTotalNominal > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Diskon total diterapkan: {formatRupiah(calculateDiskonTotalAmount())}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pengaturan PPN
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="taxMode"
                    checked={taxMode === 'none'}
                    onChange={() => setTaxMode('none')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Tanpa PPN</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="taxMode"
                    checked={taxMode === 'exclude'}
                    onChange={() => setTaxMode('exclude')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Tambah PPN {PPN_RATE}% (harga belum termasuk PPN)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="taxMode"
                    checked={taxMode === 'include'}
                    onChange={() => setTaxMode('include')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Harga sudah termasuk PPN {PPN_RATE}%</span>
                </label>
              </div>
            </div>

            {/* DP */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DP / Uang Muka dalam Persen (Opsional)
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  placeholder="Contoh: 50"
                  value={dpPercentage === 0 ? '' : dpPercentage}
                  onChange={(e) => setDpPercentage(Number(e.target.value))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="100"
                />
                <span className="text-gray-700 font-medium">%</span>
              </div>
              {dpPercentage > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  DP {dpPercentage}% = {formatRupiah(calculateDpAmount())}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sisa Tagihan (Custom Opsional)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customRemainingBillLabel}
                  onChange={(e) => setCustomRemainingBillLabel(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nama kolom (contoh: Sisa Tagihan Tahap 2)"
                />
                <input
                  type="text"
                  value={customRemainingBillAmount === null ? '' : formatRupiahInput(customRemainingBillAmount.toString())}
                  onChange={(e) => setCustomRemainingBillAmount(parseOptionalRupiahInput(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nominal custom (opsional)"
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Label aktif: {remainingBillLabel}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Penyesuaian Nominal Kolom Utama (Opsional)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={customSubtotalNominal === null ? '' : formatRupiahInput(customSubtotalNominal.toString())}
                  onChange={(e) => setCustomSubtotalNominal(parseOptionalRupiahInput(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Custom Subtotal"
                />
                <input
                  type="text"
                  value={customTotalAkhirNominal === null ? '' : formatRupiahInput(customTotalAkhirNominal.toString())}
                  onChange={(e) => setCustomTotalAkhirNominal(parseOptionalRupiahInput(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Custom Total Akhir"
                />
                <input
                  type="text"
                  value={customDpNominal === null ? '' : formatRupiahInput(customDpNominal.toString())}
                  onChange={(e) => setCustomDpNominal(parseOptionalRupiahInput(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Custom DP"
                />
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Kosongkan input kalau ingin kembali ke perhitungan otomatis.
              </p>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Baris Tambahan Manual (Tanpa Hitung Otomatis)
                </label>
                <button
                  onClick={addCustomSummaryRow}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Kolom
                </button>
              </div>
              <div className="space-y-2">
                {customSummaryRows.map((row, index) => (
                  <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updateCustomSummaryRow(row.id, 'label', e.target.value)}
                      placeholder={`Nama kolom custom ${index + 1} (contoh: DP Kedua)`}
                      className="md:col-span-7 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={row.amount === 0 ? '' : formatRupiahInput(row.amount.toString())}
                      onChange={(e) => updateCustomSummaryRow(row.id, 'amount', parseRupiahInput(e.target.value))}
                      placeholder="Nominal (contoh: 5.000.000)"
                      className="md:col-span-4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => removeCustomSummaryRow(row.id)}
                      className="md:col-span-1 px-2 py-2 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Baris ini hanya ditampilkan sebagai catatan nominal tambahan dan tidak memengaruhi subtotal/total otomatis.
              </p>
            </div>

            {/* Total */}
            <div className="bg-purple-50 rounded-md p-4 mb-4 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-gray-700">Subtotal Item:</span>
                <span className="font-semibold text-gray-800">{formatRupiah(displayedSubtotal)}</span>
              </div>
              {diskonTotalNominal > 0 && (
                <div className="flex justify-between items-center text-sm border-t pt-2">
                  <span className="font-medium text-gray-700">Diskon Total:</span>
                  <span className="font-semibold text-gray-800">- {formatRupiah(calculateDiskonTotalAmount())}</span>
                </div>
              )}
              {taxMode === 'exclude' && (
                <div className="flex justify-between items-center text-sm border-t pt-2">
                  <span className="font-medium text-gray-700">PPN ({PPN_RATE}%):</span>
                  <span className="font-semibold text-gray-800">{formatRupiah(calculatePpnAmount())}</span>
                </div>
              )}
              {taxMode === 'include' && (
                <div className="flex justify-between items-center text-sm border-t pt-2">
                  <span className="font-medium text-gray-700">PPN Termasuk ({PPN_RATE}%):</span>
                  <span className="font-semibold text-gray-800">{formatRupiah(calculatePpnAmount())}</span>
                </div>
              )}
              <div className="flex justify-between items-center border-t pt-2">
                <span className="font-bold text-lg text-gray-700">TOTAL AKHIR:</span>
                <span className="font-bold text-2xl text-purple-600">
                  {formatRupiah(displayedTotalAkhir)}
                </span>
              </div>
              {shouldShowDpRow && (
                <div className="flex justify-between items-center text-sm border-t pt-2">
                  <span className="font-medium text-gray-700">{customDpNominal !== null ? 'DP (Custom):' : `DP (${dpPercentage}%):`}</span>
                  <span className="font-semibold text-gray-800">
                    {formatRupiah(displayedDpAmount)}
                  </span>
                </div>
              )}
              {visibleCustomSummaryRows.map((row) => (
                <div key={row.id} className="flex justify-between items-center text-sm border-t pt-2">
                  <span className="font-medium text-gray-700">{row.label || 'Baris Tambahan'}:</span>
                  <span className="font-semibold text-gray-800">{formatRupiah(row.amount)}</span>
                </div>
              ))}
              {shouldShowRemainingRow && (
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="font-bold text-lg text-orange-700">{remainingBillLabel}:</span>
                  <span className="font-bold text-xl text-orange-600">
                    {formatRupiah(displayedRemainingAmount)}
                  </span>
                </div>
              )}
            </div>

            {/* Download Button */}
            <button
              onClick={generatePDF}
              className="w-full bg-purple-600 text-white py-3 rounded-md hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </button>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Preview</h2>

            <div id="preview-content" className="border border-gray-300 rounded-md p-8 bg-white">
              {/* Header */}
              <div className="mb-8">
                <img
                  src="headerpenawaran.jpeg"
                  alt="Header Serasi Parquet"
                  className="w-full h-auto"
                />
              </div>

              {/* Info Surat */}
              <div className="mb-6 text-sm">
                <p className="mb-1">No: {formData.noPenawaran || '___________'}</p>
                <p className="mb-1">Tanggal: {new Date(formData.tanggal).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}</p>
                <p className="mb-1">Perihal: {formData.perihal || '___________'}</p>
              </div>

              {/* Penerima */}
              <div className="mb-6 text-sm">
                <p className="mb-1">Kepada Yth.</p>
                <p className="font-semibold mb-1">{formData.kepada || '___________'}</p>
                {formData.perusahaan && <p className="mb-1">{formData.perusahaan}</p>}
                {formData.alamat && <p className="mb-1">{formData.alamat}</p>}
              </div>

              {/* Pembuka */}
              <div className="mb-6 text-sm">
                <p className="mb-2">Dengan hormat,</p>
                <p className="text-justify mb-3">
                  Terima kasih atas kesempatan yang diberikan kepada kami untuk mengajukan penawaran.
                  Sehubungan dengan kebutuhan Bapak/Ibu, dengan ini kami sampaikan penawaran harga
                  untuk produk/jasa yang kami tawarkan dengan rincian sebagai berikut:
                </p>
              </div>

              {/* Tabel Item */}
              <div className="mb-6 overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-white">
                      <th className="border border-black px-3 py-2 text-left text-black">No</th>
                      <th className="border border-black px-3 py-2 text-left text-black">Deskripsi</th>
                      {showQtyColumn && <th className="border border-black px-3 py-2 text-center text-black">Qty</th>}
                      {showSatuanColumn && <th className="border border-black px-3 py-2 text-center text-black">Satuan</th>}
                      <th className="border border-black px-3 py-2 text-right text-black">Harga Satuan</th>
                      <th className="border border-black px-3 py-2 text-right text-black">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className="bg-white">
                        <td className="border border-black px-3 py-2 text-black">{index + 1}</td>
                        <td className="border border-black px-3 py-2 text-black">{item.deskripsi || '-'}</td>
                        {showQtyColumn && (
                          <td className="border border-black px-3 py-2 text-center text-black">
                            {item.gunakanQty && item.qty !== '' ? item.qty : '-'}
                          </td>
                        )}
                        {showSatuanColumn && (
                          <td className="border border-black px-3 py-2 text-center text-black">
                            {item.gunakanSatuan && item.satuan ? item.satuan : '-'}
                          </td>
                        )}
                        <td className="border border-black px-3 py-2 text-right text-black">{formatRupiah(item.hargaSatuan)}</td>
                        <td className="border border-black px-3 py-2 text-right text-black">{formatRupiah(calculateSubtotal(item))}</td>
                      </tr>
                    ))}
                    <tr className="bg-white font-semibold">
                      <td colSpan={summaryColSpan} className="border border-black px-3 py-2 text-right text-black">SUBTOTAL ITEM:</td>
                      <td className="border border-black px-3 py-2 text-right text-black">{formatRupiah(displayedSubtotal)}</td>
                    </tr>
                    {diskonTotalNominal > 0 && (
                      <tr className="bg-white font-semibold">
                        <td colSpan={summaryColSpan} className="border border-black px-3 py-2 text-right text-black">DISKON TOTAL:</td>
                        <td className="border border-black px-3 py-2 text-right text-black">- {formatRupiah(calculateDiskonTotalAmount())}</td>
                      </tr>
                    )}
                    {taxMode === 'exclude' && (
                      <tr className="bg-white font-semibold">
                        <td colSpan={summaryColSpan} className="border border-black px-3 py-2 text-right text-black">PPN ({PPN_RATE}%):</td>
                        <td className="border border-black px-3 py-2 text-right text-black">{formatRupiah(calculatePpnAmount())}</td>
                      </tr>
                    )}
                    {taxMode === 'include' && (
                      <tr className="bg-white font-semibold">
                        <td colSpan={summaryColSpan} className="border border-black px-3 py-2 text-right text-black">PPN TERMASUK ({PPN_RATE}%):</td>
                        <td className="border border-black px-3 py-2 text-right text-black">{formatRupiah(calculatePpnAmount())}</td>
                      </tr>
                    )}
                    <tr className="bg-white font-bold text-base">
                      <td colSpan={summaryColSpan} className="border border-black px-3 py-2 text-right text-black">TOTAL AKHIR:</td>
                      <td className="border border-black px-3 py-2 text-right text-black">{formatRupiah(displayedTotalAkhir)}</td>
                    </tr>
                    {shouldShowDpRow && (
                      <tr className="bg-white font-semibold">
                        <td colSpan={summaryColSpan} className="border border-black px-3 py-2 text-right text-black">{customDpNominal !== null ? 'DP (Custom):' : `DP (${dpPercentage}%):`}</td>
                        <td className="border border-black px-3 py-2 text-right text-black">{formatRupiah(displayedDpAmount)}</td>
                      </tr>
                    )}
                    {visibleCustomSummaryRows.map((row) => (
                      <tr key={row.id} className="bg-white font-semibold">
                        <td colSpan={summaryColSpan} className="border border-black px-3 py-2 text-right text-black">{row.label || 'Baris Tambahan'}:</td>
                        <td className="border border-black px-3 py-2 text-right text-black">{formatRupiah(row.amount)}</td>
                      </tr>
                    ))}
                    {shouldShowRemainingRow && (
                      <tr className="bg-white font-bold text-base">
                        <td colSpan={summaryColSpan} className="border border-black px-3 py-2 text-right text-black">{remainingBillLabel}:</td>
                        <td className="border border-black px-3 py-2 text-right text-black">{formatRupiah(displayedRemainingAmount)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Note */}
              <div className="mb-6 text-sm border border-gray-300 bg-yellow-50 p-4 rounded">
                <p className="font-bold mb-2">NOTE:</p>
                <p className="mb-2">PEMBAYARAN MOHON DI TRANSFER KE REK. BCA NO. REK. 7550033997 A/N RUSWANDI</p>
                {noteText && (
                  <pre className="italic whitespace-pre-wrap break-words m-0 font-sans">
                    {noteText}
                  </pre>
                )}
              </div>

              {/* Penutup */}
              <div className="mb-8 text-sm">
                <p className="mb-3 text-justify">
                  Demikian penawaran harga ini kami sampaikan dengan sebenar-benarnya.
                  Apabila ada hal-hal yang perlu didiskusikan lebih lanjut, kami siap untuk
                  melakukan pertemuan atau komunikasi lebih lanjut.
                </p>
                <p className="text-justify">
                  Besar harapan kami penawaran ini dapat diterima dengan baik dan dapat terjalin
                  kerja sama yang saling menguntungkan. Atas perhatian dan kepercayaan yang diberikan,
                  kami ucapkan terima kasih.
                </p>
              </div>

              {/* Tanda Tangan */}
              <div className="flex justify-end">
                <div className="text-center text-sm">
                  <p className="mb-2">Hormat kami,</p>
                  <img
                    src="tanda tangan.png"
                    alt="Tanda Tangan"
                    className="w-32 h-auto mx-auto"
                  />
                  <p className="font-bold border-t border-gray-800 pt-1 mt-2">Ruswandi</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default App
