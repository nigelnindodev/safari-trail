import { UpdateProfileDto, User } from '@/types/user';
import { UnauthorizedError } from './errors';

const serverUrl = process.env.NEXT_PUBLIC_SERVER_BASE_URL;

export const apiClient = {
  async getProfile(): Promise<User> {
    console.log('fetching user profile');

    const response = await fetch(`${serverUrl}/user/profile`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('error fetching user profile', errorText);
      if (response.status === 401) {
        throw new UnauthorizedError();
      }
      throw new Error(`Failed to fetch user: ${errorText}`);
    }

    const result = await response.json();
    console.log('Fetch user profile success response', result);

    return result;
  },
  async updateProfile(data: UpdateProfileDto): Promise<User> {
    console.log('updating user profile', JSON.stringify(data));

    const response = await fetch(`${serverUrl}/user/profile`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('error updating user profile', errorText);
      if (response.status === 401) {
        throw new UnauthorizedError();
      }
      throw new Error(`Failed to update user: ${errorText}`);
    }

    const result = await response.json();
    console.log('Update user profile success response', result);

    return result;
  },
};
