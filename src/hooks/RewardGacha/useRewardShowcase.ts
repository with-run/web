import { useQuery } from '@tanstack/react-query';

import { getRewardShowcase } from '@/apis/rewardGacha';

export function useRewardShowcase() {
  return useQuery({
    queryKey: ['rewardGacha', 'showcase'],
    queryFn: async () => {
      const response = await getRewardShowcase();
      return response.data;
    },
  });
}
