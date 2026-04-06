import { useQuery } from '@tanstack/react-query';

import { getRewardPointBalance, getRewardPointHistories } from '@/apis/rewardPoints';

export function useRewardPoints() {
  const balanceQuery = useQuery({
    queryKey: ['rewardPoints', 'balance'],
    queryFn: async () => {
      const response = await getRewardPointBalance();
      return response.data;
    },
  });

  const historyQuery = useQuery({
    queryKey: ['rewardPoints', 'histories', { page: 0, size: 20 }],
    queryFn: async () => {
      const response = await getRewardPointHistories(0, 20);
      return response.data;
    },
  });

  return {
    balanceQuery,
    historyQuery,
  };
}
