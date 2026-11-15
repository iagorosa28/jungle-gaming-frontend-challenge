import Decimal from 'decimal.js'

export function formatEth(value: string) {
  return `${new Decimal(value).toFixed(2)} ETH`
}
