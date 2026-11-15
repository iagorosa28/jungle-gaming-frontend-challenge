import { queryOptions } from '@tanstack/react-query'
import { http } from '@/shared/api/http'
import { snapshotSchema, emitResultSchema, type Scenario } from '@/shared/contracts/spike'

export const spikeKeys = { all: ['spike'] as const }

export function snapshotOptions(scenario: Scenario) {
  return queryOptions({
    queryKey: [...spikeKeys.all, scenario],
    queryFn: async ({ signal }) => {
      const response = await http.get('/spike', { params: { scenario }, signal })
      return snapshotSchema.parse(response.data)
    },
    retry: false,
    staleTime: 0,
  })
}

export async function requestUpdate() {
  const response = await http.post('/spike/events', { delivery: 'next' })
  return emitResultSchema.parse(response.data)
}
