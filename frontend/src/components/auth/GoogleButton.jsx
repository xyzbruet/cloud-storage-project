// src/components/auth/GoogleButton.jsx - FINAL FIXED VERSION
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";
import { useToast } from "../Toast";

export default function GoogleButton() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const toast = useToast(); // ✅ Don't destructure - use it directly

  const handleSuccess = async (credentialResponse) => {
    try {
      console.log('Google credential received');
      
      const response = await authService.googleLogin(
        credentialResponse.credential
      );

      console.log('Backend response:', response);

      // ✅ Robust handling for both response structures
      const data = response.data || response;
      const token = data.token;
      const user = data.user || {
        email: data.email,
        fullName: data.fullName,
        storageUsed: data.storageUsed,
        storageLimit: data.storageLimit,
      };
      
      if (token) {
        // ✅ Update Zustand store with setAuth
        setAuth(token, user);
        
        toast.success('Google sign-in successful!'); // ✅ Fixed
        navigate("/dashboard", { replace: true });
      } else {
        throw new Error('No token received from server');
      }
    } catch (err) {
      console.error("Google login error:", err);
      const message = err.response?.data?.message || err.message || 'Google login failed';
      toast.error(message); // ✅ Fixed
    }
  };

  const handleError = () => {
    console.error("Google Login Failed");
    toast.error('Google sign-in failed'); // ✅ Fixed
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