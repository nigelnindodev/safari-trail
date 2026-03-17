import { apiClient } from '@/lib/api-client';
import { UpdateProfileDto, User } from '@/types/user';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function UseAuth() {
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery<User, Error>({
    queryKey: ['user'],
    queryFn: apiClient.getProfile,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: UpdateProfileDto) => apiClient.updateProfile(data),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['user'], updatedUser);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    refetch,
  };
}
