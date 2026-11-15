import Decimal from 'decimal.js'

export function formatEth(value: string) {
  const decimal = new Decimal(value)
  return `${decimal.toFixed(Math.max(2, decimal.decimalPlaces()))} ETH`
}
