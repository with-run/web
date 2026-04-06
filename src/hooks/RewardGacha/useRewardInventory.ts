import { useQuery } from '@tanstack/react-query';

import { getRewardInventory } from '@/apis/rewardGacha';

export function useRewardInventory(enabled: boolean) {
  return useQuery({
    queryKey: ['rewardGacha', 'inventory', { page: 0, size: 20 }],
    queryFn: async () => {
      const response = await getRewardInventory(0, 20);
      return response.data;
    },
    enabled,
  });
}
