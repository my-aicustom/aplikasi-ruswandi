/**
 * Utility untuk konversi angka nominal ke kalimat terbilang Bahasa Indonesia.
 * Contoh: 25200000 -> "Dua puluh lima juta dua ratus ribu rupiah"
 */

const SATUAN = [
  '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
  'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
]

function convertChunk(n) {
  if (n < 12) {
    return SATUAN[n]
  } else if (n < 20) {
    return convertChunk(n - 10) + ' Belas'
  } else if (n < 100) {
    const tens = Math.floor(n / 10)
    const rest = n % 10
    return SATUAN[tens] + ' Puluh' + (rest !== 0 ? ' ' + convertChunk(rest) : '')
  } else if (n < 200) {
    const rest = n - 100
    return 'Seratus' + (rest !== 0 ? ' ' + convertChunk(rest) : '')
  } else if (n < 1000) {
    const hundreds = Math.floor(n / 100)
    const rest = n % 100
    return SATUAN[hundreds] + ' Ratus' + (rest !== 0 ? ' ' + convertChunk(rest) : '')
  } else if (n < 2000) {
    const rest = n - 1000
    return 'Seribu' + (rest !== 0 ? ' ' + convertChunk(rest) : '')
  } else if (n < 1000000) {
    const thousands = Math.floor(n / 1000)
    const rest = n % 1000
    return convertChunk(thousands) + ' Ribu' + (rest !== 0 ? ' ' + convertChunk(rest) : '')
  } else if (n < 1000000000) {
    const millions = Math.floor(n / 1000000)
    const rest = n % 1000000
    return convertChunk(millions) + ' Juta' + (rest !== 0 ? ' ' + convertChunk(rest) : '')
  } else if (n < 1000000000000) {
    const billions = Math.floor(n / 1000000000)
    const rest = n % 1000000000
    return convertChunk(billions) + ' Miliar' + (rest !== 0 ? ' ' + convertChunk(rest) : '')
  } else if (n < 1000000000000000) {
    const trillions = Math.floor(n / 1000000000000)
    const rest = n % 1000000000000
    return convertChunk(trillions) + ' Triliun' + (rest !== 0 ? ' ' + convertChunk(rest) : '')
  }
  return ''
}

export function terbilangRupiah(val) {
  const num = Math.floor(Math.abs(Number(val) || 0))
  if (num === 0) return 'Nol rupiah'
  const raw = convertChunk(num).trim().replace(/\s+/g, ' ')
  if (!raw) return ''
  // Format sentence casing: "Dua puluh lima juta dua ratus ribu rupiah"
  const lower = raw.toLowerCase()
  const formatted = lower.charAt(0).toUpperCase() + lower.slice(1)
  return `${formatted} rupiah`
}

export function formatRupiahDisplay(angka) {
  if (angka === null || angka === undefined || isNaN(angka)) return 'Rp. 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(angka).replace(/\u00a0/g, ' ')
}

export function formatNumberDots(value) {
  const numbers = value.toString().replace(/\D/g, '')
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function parseNumberDots(value) {
  if (typeof value === 'number') return value
  const numbers = (value || '').toString().replace(/\D/g, '')
  return numbers ? parseInt(numbers, 10) : 0
}
