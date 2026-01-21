// src/components/auth/GoogleButton.jsx - FIXED
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/authService";
import { useAuthStore } from "../../store/authStore";
import { useToast } from "../Toast";

export default function GoogleButton() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore(); // ✅ Use setAuth instead of setToken/setUser
  const { showToast } = useToast();

  const handleSuccess = async (credentialResponse) => {
    try {
      console.log('Google credential received');
      
      const response = await authService.googleLogin(
        credentialResponse.credential
      );

      console.log('Backend response:', response.data);

      if (response.data.success && response.data.data) {
        const { token, user } = response.data.data;
        
        // ✅ Update Zustand store with setAuth
        setAuth(token, user);
        
        showToast('Google sign-in successful!', 'success');
        navigate("/dashboard", { replace: true });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error("Google login error:", err);
      const message = err.response?.data?.message || 'Google login failed';
      showToast(message, 'error');
    }
  };

  const handleError = () => {
    console.error("Google Login Failed");
    showToast('Google sign-in failed', 'error');
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