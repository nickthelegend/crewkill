import { useState, useEffect, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import { usePrivyEnabled } from "@/components/layout/Providers";
import { generateOperatorKey } from "@/lib/operatorKeys";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const STORAGE_KEY = "amongus-operator-key";

export interface OperatorKeyData {
  operatorKey: string;
  walletAddress: string;
  createdAt: number;
}

export function useOperatorKey() {
  const privyEnabled = usePrivyEnabled();
  const { authenticated, user, getAccessToken } = usePrivy();
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();

  const [operatorKey, setOperatorKey] = useState<OperatorKeyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Effective wallet address and connection status
  const walletAddress = privyEnabled ? user?.wallet?.address : wagmiAddress;
  const isAuthOrConnected = privyEnabled ? authenticated : wagmiConnected;

  // Load locally saved key immediately if possible (prevent flash)
  useEffect(() => {
    if (!walletAddress) return;
    const saved = localStorage.getItem(
      `${STORAGE_KEY}-${walletAddress.toLowerCase()}`,
    );
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setOperatorKey(data);
      } catch {}
    }
  }, [walletAddress]);

  const validateKeyWithServer = useCallback(
    async (key: string): Promise<boolean> => {
      try {
        const res = await fetch(`${API_URL}/api/operators/me`, {
          headers: { Authorization: `Bearer ${key}` },
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    [],
  );

  const registerKeyWithServer = useCallback(
    async (
      key: string,
      wallet: string,
    ): Promise<{ success: boolean; operatorKey?: string }> => {
      try {
        const res = await fetch(`${API_URL}/api/operators`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({ walletAddress: wallet }),
        });

        if (res.ok) {
          const data = await res.json();
          return { success: true, operatorKey: data.operatorKey };
        }
      } catch {}
      return { success: false };
    },
    [],
  );

  const generateAndRegisterKey = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);
    try {
      const newKey = generateOperatorKey();
      const result = await registerKeyWithServer(newKey, walletAddress);

      if (!result.success) throw new Error("Failed to register key");

      const finalKey = result.operatorKey || newKey;
      const keyData: OperatorKeyData = {
        operatorKey: finalKey,
        walletAddress: walletAddress.toLowerCase(),
        createdAt: Date.now(),
      };

      localStorage.setItem(
        `${STORAGE_KEY}-${walletAddress.toLowerCase()}`,
        JSON.stringify(keyData),
      );
      setOperatorKey(keyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate key");
    } finally {
      setLoading(false);
    }
  }, [walletAddress, registerKeyWithServer]);

  // Initialization logic
  useEffect(() => {
    if (!walletAddress || initialized) {
      if (!walletAddress) setLoading(false);
      return;
    }

    const initKey = async () => {
      setInitialized(true);
      setLoading(true);

      try {
        let currentKeyData = operatorKey;
        if (!currentKeyData) {
          const saved = localStorage.getItem(
            `${STORAGE_KEY}-${walletAddress.toLowerCase()}`,
          );
          if (saved) currentKeyData = JSON.parse(saved);
        }

        if (currentKeyData) {
          const isValid = await validateKeyWithServer(
            currentKeyData.operatorKey,
          );
          if (isValid) {
            setOperatorKey(currentKeyData);
            setLoading(false);
            return;
          }
        }

        if (privyEnabled) {
          const token = await getAccessToken();
          if (token) {
            const result = await api.getActiveOperatorKey(token);
            if (result.success && result.operatorKey) {
              const keyData = {
                operatorKey: result.operatorKey,
                walletAddress: walletAddress.toLowerCase(),
                createdAt: result.createdAt || Date.now(),
              };
              localStorage.setItem(
                `${STORAGE_KEY}-${walletAddress.toLowerCase()}`,
                JSON.stringify(keyData),
              );
              setOperatorKey(keyData);
              setLoading(false);
              return;
            }
          }
        }

        await generateAndRegisterKey();
      } catch (e) {
        console.error(e);
        setError("Failed to initialize key");
      } finally {
        setLoading(false);
      }
    };
    initKey();
  }, [
    walletAddress,
    initialized,
    privyEnabled,
    getAccessToken,
    validateKeyWithServer,
    generateAndRegisterKey,
  ]);

  // Reset on wallet change
  useEffect(() => {
    setInitialized(false);
    setOperatorKey(null);
  }, [walletAddress]);

  return {
    operatorKey,
    loading,
    error,
    regenerateKey: generateAndRegisterKey,
    walletAddress,
    isAuthOrConnected,
  };
}
