
import { Button } from "@/components/ui/button";
import { useEnokiAuth } from "@/hooks/useEnokiAuth";
import { Loader2, LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ZkLoginButtonProps {
  onSuccess?: (address: string) => void;
  className?: string;
  showDetailedStatus?: boolean;
  showLogout?: boolean;
}

export const ZkLoginButton = ({ 
  onSuccess, 
  className, 
  showDetailedStatus = false, 
  showLogout = true 
}: ZkLoginButtonProps) => {
  const { startZkLogin, isLoading, userAddress, isAuthenticated, error, logout } = useEnokiAuth();

  const handleLogin = () => {
    if (userAddress && isAuthenticated && onSuccess) {
      onSuccess(userAddress);
    } else {
      startZkLogin();
    }
  };

  const handleLogout = () => {
    logout();
  };

  // If user is authenticated with Enoki
  if (userAddress && isAuthenticated) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleLogin}
            className={className}
            variant="outline"
          >
            🔐 Connected: {userAddress.slice(0, 6)}...{userAddress.slice(-4)}
          </Button>
          {showLogout && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-400">
                  <LogOut className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-gray-900 border-gray-700">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Logout from ZK Login?</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-300">
                    This will disconnect your Google authentication session managed by Enoki. Your wallet address will remain the same when you log back in with the same Google account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-500"
                  >
                    Logout
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
        {showDetailedStatus && (
          <p className="text-xs text-green-400">✅ Ready for transactions (Enoki)</p>
        )}
      </div>
    );
  }

  // Default state - not logged in
  return (
    <div className="space-y-2">
      <Button 
        onClick={startZkLogin}
        disabled={isLoading}
        className={className}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        🔐 Login with Google (ZK)
      </Button>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
      {showDetailedStatus && !userAddress && (
        <p className="text-xs text-gray-400">
          ZK Login powered by Enoki for secure wallet access
        </p>
      )}
    </div>
  );
};
