import SupabaseTestHub from "./components/testing/SupabaseTestHub";
import ProtectedRoute from "./components/common/ProtectedRoute";

export default function SupabaseTestHubScreen() {
  return (
    <ProtectedRoute requiredRole="admin">
      <SupabaseTestHub />
    </ProtectedRoute>
  );
}
