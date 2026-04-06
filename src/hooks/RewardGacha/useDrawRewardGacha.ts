import { useMutation, useQueryClient } from '@tanstack/react-query';

import { drawRewardGacha } from '@/apis/rewardGacha';

export function useDrawRewardGacha() {
  const queryClient = useQueryClient();

  async function refreshRewardGachaState() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['rewardPoints', 'balance'] }),
      queryClient.invalidateQueries({ queryKey: ['rewardPoints', 'histories'] }),
      queryClient.invalidateQueries({ queryKey: ['rewardGacha', 'inventory'] }),
    ]);
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await drawRewardGacha();
      return response.data;
    },
  });

  return {
    ...mutation,
    refreshRewardGachaState,
  };
}
