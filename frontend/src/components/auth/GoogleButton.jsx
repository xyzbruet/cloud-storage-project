import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";
import { useToast } from "../Toast";

export default function GoogleButton() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const toast = useToast();

  const handleSuccess = async (credentialResponse) => {
    try {
      console.log('🔵 Google credential received, starting login...');
      
      // Call backend
      const response = await authService.googleLogin(
        credentialResponse.credential
      );

      console.log('✅ Backend login successful');

      // authService already saved to localStorage, so read from there
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;

      console.log('🔑 Token from localStorage:', token ? 'Found ✅' : 'Missing ❌');
      console.log('👤 User from localStorage:', user ? 'Found ✅' : 'Missing ❌');

      if (token && user) {
        console.log('🔄 Updating Zustand store with setAuth...');
        
        // Update Zustand store
        setAuth(token, user);
        
        // Verify store was updated
        const storeState = useAuthStore.getState();
        console.log('📊 Zustand store after setAuth:', {
          isAuthenticated: storeState.isAuthenticated,
          hasUser: !!storeState.user,
          hasToken: !!storeState.token
        });
        
        // Show success message
        if (toast?.success) {
          toast.success(`Welcome back, ${user.fullName}!`);
        } else {
          console.log('✅ Login successful! Welcome back:', user.fullName);
        }
        
        // Navigate after ensuring state is updated
        console.log('🚀 Navigating to dashboard in 300ms...');
        setTimeout(() => {
          console.log('⏭️ Executing navigation now...');
          navigate("/dashboard", { replace: true });
        }, 300);
      } else {
        console.error('❌ Token or user missing after authService.googleLogin');
        throw new Error('Authentication data missing after login');
      }
    } catch (err) {
      console.error("❌ Google login error:", err);
      const message = err.response?.data?.message || err.message || 'Google login failed';
      
      if (toast?.error) {
        toast.error(message);
      } else {
        console.error('Error message:', message);
        alert(message);
      }
    }
  };

  const handleError = () => {
    console.error("❌ Google Login Failed");
    
    if (toast?.error) {
      toast.error('Google sign-in failed. Please try again.');
    } else {
      console.error('Google sign-in failed');
      alert('Google sign-in failed. Please try again.');
    }
  };

  return (
    <div className="w-full">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleError}
        useOneTap={false}
        theme="outline"
        size="large"
        width="100%"
        text="continue_with"
        shape="rectangular"
      />
    </div>
  );
}