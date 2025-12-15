"use client";

import { getUserSettings } from "@/app/actions/user-settings";
import { getCurrentUser } from "@/app/actions/auth";
import { createContext, useContext, useEffect, useState } from "react";

type TimezoneContextType = {
  timezone: string;
  isLoading: boolean;
  refreshTimezone: () => Promise<void>;
};

const TimezoneContext = createContext<TimezoneContextType>({
  timezone: "America/Sao_Paulo", // Default timezone
  isLoading: true,
  refreshTimezone: async () => {},
});

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [timezone, setTimezone] = useState<string>("America/Sao_Paulo");
  const [isLoading, setIsLoading] = useState(true);

  const loadTimezone = async () => {
    try {
      const user = await getCurrentUser();

      if (user) {
        const settingsResult = await getUserSettings(user.id);

        if (settingsResult.success && settingsResult.data) {
          setTimezone(settingsResult.data.timezone);
        }
      }
    } catch (error) {
      console.error("Error loading timezone:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTimezone();
  }, []);

  const refreshTimezone = async () => {
    await loadTimezone();
  };

  return (
    <TimezoneContext.Provider value={{ timezone, isLoading, refreshTimezone }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  const context = useContext(TimezoneContext);
  if (!context) {
    throw new Error("useTimezone must be used within TimezoneProvider");
  }
  return context;
}
