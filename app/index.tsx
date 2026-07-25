import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/useAuthStore';

export default function Index() {
  const status = useAuthStore((s) => s.status);
  return <Redirect href={status === 'authed' ? '/(tabs)' : '/(auth)/welcome'} />;
}
